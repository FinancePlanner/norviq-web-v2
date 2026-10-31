import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { formatFloat } from '#lib/format.js';
import {
	BUDGET_PILLARS,
	normalizeShares,
	mergePillarKeys,
	resolvePillarKey,
	resolvePillars
} from '../pillars.js';
import {
	categoryURL,
	expensesPlannerURL,
	isISODate,
	monthQueryString,
	monthStartDate,
	parseExpensesMonth,
	type Month
} from './month.js';
import {
	formatSharePercent,
	getPartner,
	getSnapshot,
	listCategories,
	listRecurring,
	mapCategoryOptions,
	parsePositiveFloat
} from './planner.server.js';
import type { BudgetPlanItem, BudgetSnapshot } from './types.js';
import type * as VM from './vm.js';

// Ports of the modal form handlers: expenses.go (record, salary, partner,
// delete), expenses_plan_item.go, expenses_category.go, expenses_recurring.go.
// Each submit answers like the Go htmx handler: a redirect (HX-Redirect) on
// success, or the panel again with an error (`fail(400, { vm })`).

const field = (fd: FormData, name: string) => String(fd.get(name) ?? '').trim();
const rawField = (fd: FormData, name: string) => String(fd.get(name) ?? '');
const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
export const isUUID = (v: string) => UUID_RE.test(v.trim());

/** Pre-fill from the household default; the split mode stays the user's choice. */
async function partnerDefaults(event: RequestEvent) {
	const partner = await getPartner(event);
	return {
		hasPartner: !!partner?.displayName?.trim(),
		share:
			partner?.defaultUserSharePercent != null
				? formatSharePercent(partner.defaultUserSharePercent)
				: null
	};
}

function parseSplit(fd: FormData): { mode: 'personal' | 'shared'; share: number } {
	const mode = field(fd, 'split_mode').toLowerCase() === 'shared' ? 'shared' : 'personal';
	let share = 100;
	const raw = field(fd, 'user_share_percent');
	if (raw) {
		const v = parsePositiveFloat(raw);
		if (v !== null && v <= 100) share = v;
	}
	return { mode, share };
}

// ---------- record expense ----------

export async function loadRecordExpenseFormVM(
	event: RequestEvent,
	monthQuery: string,
	recurringID: string
): Promise<VM.RecordExpenseFormVM> {
	const [categories, partner] = await Promise.all([listCategories(event), partnerDefaults(event)]);
	const vm: VM.RecordExpenseFormVM = {
		monthQuery: monthQuery.trim(),
		title: '',
		amount: '',
		pillar: BUDGET_PILLARS[0].key,
		categories: mapCategoryOptions(categories),
		selectedCategory: '',
		splitMode: 'personal',
		userSharePercent: partner.share ?? '100',
		hasPartner: partner.hasPartner,
		error: ''
	};
	const rid = recurringID.trim();
	if (!rid) return vm;
	const item = (await listRecurring(event)).find((t) => t.id === rid);
	if (item) {
		vm.title = item.title;
		vm.amount = formatFloat(item.amount, 2);
		vm.pillar = item.pillar;
		vm.splitMode = item.splitMode;
		vm.userSharePercent = formatSharePercent(item.userSharePercent);
		if (item.categoryId) vm.selectedCategory = item.categoryId;
	}
	return vm;
}

function receiptMetadataFromForm(fd: FormData) {
	const source = field(fd, 'receipt_source');
	if (source !== 'qr' && source !== 'ocr') return undefined;
	const meta: Record<string, unknown> = { source };
	const merchant = field(fd, 'receipt_merchant');
	if (merchant) meta.merchant = merchant;
	const taxId = field(fd, 'receipt_tax_id');
	if (taxId) meta.taxIdentifier = taxId;
	const currency = field(fd, 'receipt_currency');
	if (currency) meta.currency = currency;
	// optionalFloat: any parseable number, including 0.
	const totalRaw = field(fd, 'receipt_total');
	if (totalRaw && /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(totalRaw.replaceAll(',', '.'))) {
		meta.total = Number(totalRaw.replaceAll(',', '.'));
	}
	const issued = field(fd, 'receipt_issued_on');
	if (issued && isISODate(issued)) meta.issuedOn = issued;
	return meta;
}

export async function submitRecordExpense(event: RequestEvent) {
	const fd = await event.request.formData();
	const monthQuery = field(fd, 'month');
	const renderError = async (msg: string) => {
		const vm = await loadRecordExpenseFormVM(event, monthQuery, '');
		vm.title = field(fd, 'title');
		vm.amount = field(fd, 'amount');
		if (field(fd, 'pillar')) vm.pillar = field(fd, 'pillar');
		vm.selectedCategory = field(fd, 'category_id');
		if (field(fd, 'split_mode')) vm.splitMode = field(fd, 'split_mode');
		if (field(fd, 'user_share_percent')) vm.userSharePercent = field(fd, 'user_share_percent');
		vm.error = msg;
		return fail(400, { vm });
	};

	const title = field(fd, 'title');
	if (!title) return renderError('Enter a title for this expense.');
	const amount = parsePositiveFloat(field(fd, 'amount'));
	if (amount === null) return renderError('Enter a valid amount.');
	const pillar = resolvePillarKey(field(fd, 'pillar'))?.key ?? 'fundamentals';

	const month = parseExpensesMonth(monthQuery);
	let occurredOn = monthStartDate(month);
	const occurredRaw = field(fd, 'occurred_on');
	if (occurredRaw && isISODate(occurredRaw)) occurredOn = occurredRaw;

	const split = parseSplit(fd);
	const body: Record<string, unknown> = {
		title,
		amount,
		pillar,
		occurredOn,
		splitMode: split.mode,
		// A personal expense is always 100% the owner's.
		userSharePercent: split.mode === 'personal' ? 100 : split.share
	};
	const categoryID = field(fd, 'category_id');
	if (categoryID && isUUID(categoryID)) body.categoryId = categoryID;
	const receipt = receiptMetadataFromForm(fd);
	if (receipt) body.receiptMetadata = receipt;

	try {
		await apiJSON(event, 'POST', '/v1/expenses', body);
	} catch (err) {
		console.warn('create expense', err);
		return renderError('Could not save expense. Try again.');
	}
	redirect(303, expensesPlannerURL(month));
}

// ---------- salary ----------

function salaryShareFields(
	shares: Record<string, number> | null | undefined
): VM.SalaryFormVM['shares'] {
	const normalized = normalizeShares(shares);
	return resolvePillars(...mergePillarKeys(normalized)).map((p) => ({
		key: p.key,
		label: p.label,
		hint: p.hint,
		value: normalized && p.key in normalized ? formatFloat(normalized[p.key] * 100, 0) : ''
	}));
}

export async function loadSalaryFormVM(
	event: RequestEvent,
	monthRaw: string | null
): Promise<VM.SalaryFormVM> {
	const month = parseExpensesMonth(monthRaw);
	const vm: VM.SalaryFormVM = {
		monthQuery: monthQueryString(month),
		snapshotID: '',
		salary: '',
		shares: salaryShareFields(null),
		error: ''
	};
	let snap: BudgetSnapshot | null = null;
	try {
		snap = await getSnapshot(event, month);
	} catch {
		return vm;
	}
	if (!snap) return vm;
	vm.snapshotID = snap.id;
	vm.salary = formatFloat(snap.netSalary, 2);
	vm.shares = salaryShareFields(snap.targetShares);
	return vm;
}

export async function submitSalary(event: RequestEvent) {
	const fd = await event.request.formData();
	const renderError = async (msg: string) => {
		const vm = await loadSalaryFormVM(event, rawField(fd, 'month'));
		vm.error = msg;
		return fail(400, { vm });
	};
	const monthQuery = field(fd, 'month');
	const snapshotID = field(fd, 'snapshot_id');
	const salary = parsePositiveFloat(field(fd, 'net_salary'));
	if (salary === null) return renderError('Enter a valid monthly net salary.');

	const shares: Record<string, number> = {};
	let total = 0;
	for (const p of BUDGET_PILLARS) {
		const raw = field(fd, 'share_' + p.key);
		if (!raw) continue;
		const v = parsePositiveFloat(raw);
		if (v === null) return renderError('Enter valid percentage splits for each pillar.');
		shares[p.key] = v;
		total += v;
	}
	if (Object.keys(shares).length === 0) return renderError('Set at least one budget pillar split.');
	if (total < 99.9 || total > 100.1) return renderError('Pillar splits should add up to 100%.');
	// The form collects percentages; targetShares is a fraction of net salary.
	for (const k of Object.keys(shares)) shares[k] = shares[k] / 100;

	const month = parseExpensesMonth(monthQuery);
	const body = { monthStart: monthStartDate(month), netSalary: salary, targetShares: shares };
	if (snapshotID) {
		if (!isUUID(snapshotID)) return renderError('Invalid budget snapshot.');
		try {
			await apiJSON(event, 'PATCH', `/v1/budget/snapshots/${snapshotID}`, body);
		} catch {
			return renderError('Could not update salary and targets.');
		}
	} else {
		try {
			await apiJSON(event, 'POST', '/v1/budget/snapshots', body);
		} catch {
			return renderError('Could not save salary and targets.');
		}
	}
	// session.NoteGuidedAction(..., "set_budget")
	if (event.locals.session.get<string>('guidedStartStep') === 'set_budget') {
		await event.locals.session.set('guidedStartStepActed', true);
	}
	redirect(303, expensesPlannerURL(month));
}

// ---------- partner ----------

export async function loadPartnerFormVM(event: RequestEvent): Promise<VM.PartnerFormVM> {
	const vm: VM.PartnerFormVM = { displayName: '', defaultSharePercent: '', error: '' };
	const partner = await getPartner(event);
	if (partner) {
		if (partner.displayName != null) vm.displayName = partner.displayName.trim();
		if (partner.defaultUserSharePercent != null)
			vm.defaultSharePercent = formatSharePercent(partner.defaultUserSharePercent);
	}
	return vm;
}

export async function submitPartner(event: RequestEvent) {
	const fd = await event.request.formData();
	const renderError = (msg: string) =>
		fail(400, {
			vm: {
				error: msg,
				displayName: rawField(fd, 'display_name'),
				defaultSharePercent: rawField(fd, 'default_share_percent')
			}
		});
	const name = field(fd, 'display_name');
	// Blank clears the household default (nil ≠ 0); outside 0–100 is rejected.
	const rawShare = field(fd, 'default_share_percent');
	let defaultShare: number | undefined;
	if (rawShare) {
		const v = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(rawShare) ? Number(rawShare) : NaN;
		if (!Number.isFinite(v) || v < 0 || v > 100)
			return renderError('Default share must be a whole number between 0 and 100.');
		defaultShare = v;
	}
	const body: Record<string, unknown> = { displayName: name };
	if (defaultShare !== undefined) body.defaultUserSharePercent = defaultShare;
	try {
		await apiJSON(event, 'PUT', '/v1/expenses/partner', body);
	} catch {
		return renderError('Could not save partner profile.');
	}
	redirect(303, '/expenses');
}

// ---------- plan items ----------

export async function loadPlanItemFormVM(
	event: RequestEvent,
	monthRaw: string | null,
	itemID: string
): Promise<VM.PlanItemFormVM> {
	const month = parseExpensesMonth(monthRaw);
	const vm: VM.PlanItemFormVM = {
		monthQuery: monthQueryString(month),
		snapshotID: '',
		itemID: '',
		title: '',
		plannedAmount: '',
		pillar: BUDGET_PILLARS[0].key,
		splitMode: 'personal',
		userSharePercent: '100',
		hasPartner: false,
		isEdit: false,
		error: ''
	};
	const [partner, snap] = await Promise.all([
		partnerDefaults(event),
		getSnapshot(event, month).catch(() => null)
	]);
	vm.hasPartner = partner.hasPartner;
	if (partner.share !== null) vm.userSharePercent = partner.share;
	if (snap) vm.snapshotID = snap.id;

	const id = itemID.trim();
	if (!id) return vm;
	vm.isEdit = true;
	vm.itemID = id;
	let items: BudgetPlanItem[];
	try {
		items = await apiJSON<BudgetPlanItem[]>(event, 'GET', '/v1/budget/items');
	} catch {
		vm.error = 'Could not load plan item.';
		return vm;
	}
	if (!isUUID(id)) {
		vm.error = 'Invalid plan item.';
		return vm;
	}
	const item = items.find((i) => i.id.toLowerCase() === id.toLowerCase());
	if (!item) {
		vm.error = 'Plan item not found.';
		return vm;
	}
	vm.title = item.title;
	vm.plannedAmount = formatFloat(item.plannedAmount, 2);
	vm.pillar = item.pillar;
	vm.splitMode = item.splitMode;
	vm.userSharePercent = formatFloat(item.userSharePercent, 0);
	vm.snapshotID = item.snapshotId;
	return vm;
}

/** ensurePlannerSnapshot: the month's snapshot, created with default shares when missing. */
async function ensurePlannerSnapshot(event: RequestEvent, month: Month): Promise<string> {
	const existing = await getSnapshot(event, month).catch(() => null);
	if (existing) return existing.id;
	const created = await apiJSON<BudgetSnapshot>(event, 'POST', '/v1/budget/snapshots', {
		monthStart: monthStartDate(month),
		netSalary: 0,
		targetShares: Object.fromEntries(BUDGET_PILLARS.map((p) => [p.key, p.defaultShare]))
	});
	return created.id;
}

export async function submitPlanItem(event: RequestEvent, itemID: string) {
	const fd = await event.request.formData();
	const renderError = async (msg: string) => {
		const vm = await loadPlanItemFormVM(event, rawField(fd, 'month'), itemID);
		vm.error = msg;
		if (field(fd, 'title')) vm.title = field(fd, 'title');
		if (field(fd, 'planned_amount')) vm.plannedAmount = field(fd, 'planned_amount');
		if (field(fd, 'pillar')) vm.pillar = field(fd, 'pillar');
		if (field(fd, 'split_mode')) vm.splitMode = field(fd, 'split_mode');
		if (field(fd, 'user_share_percent')) vm.userSharePercent = field(fd, 'user_share_percent');
		return fail(400, { vm });
	};
	const month = parseExpensesMonth(field(fd, 'month'));

	// buildPlanItemRequest
	const title = field(fd, 'title');
	if (!title) return renderError('Enter a title for this plan item.');
	const amount = parsePositiveFloat(field(fd, 'planned_amount'));
	if (amount === null) return renderError('Enter a valid planned amount.');
	const pillar = resolvePillarKey(field(fd, 'pillar'))?.key ?? BUDGET_PILLARS[0].key;
	const split = parseSplit(fd);
	let snapshotID = field(fd, 'snapshot_id');
	if (!isUUID(snapshotID)) {
		try {
			snapshotID = await ensurePlannerSnapshot(event, month);
		} catch {
			return renderError('Set up your monthly budget first, then add plan items.');
		}
	}
	const body = {
		snapshotId: snapshotID,
		title,
		plannedAmount: amount,
		pillar,
		splitMode: split.mode,
		userSharePercent: split.share
	};

	if (!itemID) {
		try {
			await apiJSON(event, 'POST', '/v1/budget/items', body);
		} catch {
			return renderError('Could not save plan item.');
		}
	} else {
		if (!isUUID(itemID)) return renderError('Invalid plan item.');
		try {
			await apiJSON(event, 'PATCH', `/v1/budget/items/${itemID}`, body);
		} catch {
			return renderError('Could not update plan item.');
		}
	}
	redirect(303, expensesPlannerURL(month));
}

export async function deletePlanItem(event: RequestEvent, itemID: string) {
	if (!isUUID(itemID)) return fail(400, { message: 'Invalid plan item' });
	try {
		await apiJSON(event, 'DELETE', `/v1/budget/items/${itemID}`);
	} catch {
		return fail(502, { message: 'Could not delete plan item' });
	}
	redirect(303, expensesPlannerURL(parseExpensesMonth(event.url.searchParams.get('month'))));
}

// ---------- category labels ----------

export async function submitCategory(event: RequestEvent) {
	const fd = await event.request.formData();
	const renderError = (msg: string) =>
		fail(400, {
			vm: {
				monthQuery: field(fd, 'month'),
				name: field(fd, 'name'),
				pillar: field(fd, 'pillar'),
				error: msg
			} satisfies VM.CategoryFormVM
		});
	const monthQuery = field(fd, 'month');
	const name = field(fd, 'name');
	const pillar = field(fd, 'pillar');
	if (!name) return renderError('Enter a category name.');
	const body: Record<string, unknown> = { name };
	if (pillar) {
		const def = resolvePillarKey(pillar);
		if (def) body.pillar = def.key;
	}
	try {
		await apiJSON(event, 'POST', '/v1/expenses/categories', body);
	} catch {
		return renderError('Could not save category.');
	}
	redirect(303, expensesPlannerURL(parseExpensesMonth(monthQuery)));
}

// ---------- recurring templates ----------

export async function loadRecurringTemplateFormVM(
	event: RequestEvent,
	monthRaw: string | null,
	templateID: string
): Promise<VM.RecurringTemplateFormVM> {
	const [categories, partner] = await Promise.all([listCategories(event), partnerDefaults(event)]);
	const vm: VM.RecurringTemplateFormVM = {
		monthQuery: monthQueryString(parseExpensesMonth(monthRaw)),
		templateID: '',
		title: '',
		amount: '',
		pillar: BUDGET_PILLARS[0].key,
		frequency: 'monthly',
		categoryID: '',
		splitMode: 'personal',
		userSharePercent: partner.share ?? '100',
		categories: mapCategoryOptions(categories),
		hasPartner: partner.hasPartner,
		isEdit: false,
		error: ''
	};
	const id = templateID.trim();
	if (!id) return vm;
	vm.isEdit = true;
	vm.templateID = id;
	const item = (await listRecurring(event)).find((t) => t.id === id);
	if (!item) {
		vm.error = 'Recurring template not found.';
		return vm;
	}
	vm.title = item.title;
	vm.amount = formatFloat(item.amount, 2);
	vm.pillar = item.pillar;
	vm.frequency = item.frequency;
	vm.splitMode = item.splitMode;
	vm.userSharePercent = formatFloat(item.userSharePercent, 0);
	if (item.categoryId) vm.categoryID = item.categoryId;
	return vm;
}

export async function submitRecurring(event: RequestEvent, templateID: string) {
	const fd = await event.request.formData();
	const renderError = async (msg: string) => {
		const vm = await loadRecurringTemplateFormVM(event, rawField(fd, 'month'), templateID);
		vm.error = msg;
		for (const [key, name] of [
			['title', 'title'],
			['amount', 'amount'],
			['pillar', 'pillar'],
			['frequency', 'frequency'],
			['categoryID', 'category_id'],
			['splitMode', 'split_mode'],
			['userSharePercent', 'user_share_percent']
		] as const) {
			if (field(fd, name)) vm[key] = field(fd, name);
		}
		return fail(400, { vm });
	};
	const monthQuery = field(fd, 'month');
	const title = field(fd, 'title');
	if (!title) return renderError('Enter a title for this recurring expense.');
	const amount = parsePositiveFloat(field(fd, 'amount'));
	if (amount === null) return renderError('Enter a valid amount.');
	const pillar = resolvePillarKey(field(fd, 'pillar'))?.key ?? BUDGET_PILLARS[0].key;
	const frequency = field(fd, 'frequency').toLowerCase() === 'weekly' ? 'weekly' : 'monthly';
	const split = parseSplit(fd);
	const body: Record<string, unknown> = {
		title,
		amount,
		pillar,
		frequency,
		splitMode: split.mode,
		userSharePercent: split.share
	};
	const categoryID = field(fd, 'category_id');
	if (categoryID && isUUID(categoryID)) body.categoryId = categoryID;

	if (!templateID) {
		try {
			await apiJSON(event, 'POST', '/v1/expenses/recurring', body);
		} catch {
			return renderError('Could not save recurring template.');
		}
	} else {
		if (!isUUID(templateID)) return renderError('Invalid recurring template.');
		try {
			await apiJSON(event, 'PATCH', `/v1/expenses/recurring/${templateID}`, body);
		} catch {
			return renderError('Could not update recurring template.');
		}
	}
	redirect(303, expensesPlannerURL(parseExpensesMonth(monthQuery)));
}

export async function deleteRecurring(event: RequestEvent, templateID: string) {
	if (!isUUID(templateID)) return fail(400, { message: 'Invalid recurring template' });
	try {
		await apiJSON(event, 'DELETE', `/v1/expenses/recurring/${templateID}`);
	} catch {
		return fail(502, { message: 'Could not delete recurring template' });
	}
	// Go re-rendered #expenses-recurring-body; the planner reload does the same.
	redirect(303, expensesPlannerURL(parseExpensesMonth(event.url.searchParams.get('month'))));
}

// ---------- DELETE /expenses/{id} ----------

export function expenseDeleteTarget(url: URL): string {
	const month = parseExpensesMonth(url.searchParams.get('month'));
	const def = resolvePillarKey(url.searchParams.get('pillar'));
	return def ? categoryURL(def.key, month) : expensesPlannerURL(month);
}
