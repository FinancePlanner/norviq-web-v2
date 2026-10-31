import { json, redirect, type RequestEvent } from '@sveltejs/kit';
import { APIError, apiFetch, type RawOptions } from '#lib/server/api.js';
import { isPro as billingIsPro } from '#lib/billing.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import { currencySymbol, ErrEmpty, parseAmount } from '#lib/format.js';
import {
	aiConsentReturnPath,
	hasAIConsent,
	isAIConsentRequired
} from '#lib/features/dashboard/ai-consent.server.js';
import {
	Cadence,
	SuggestionState,
	type AutobuyFormVM,
	type AutobuysListResponse,
	type AutobuysVM,
	type CreateFormVM,
	type RowEditResult,
	type ShareFactsSuggestion,
	type SuggestionResult,
	type TerminalPositionResponse,
	type TerminalPositionsListResponse,
	type TerminalPositionsSummaryResponse,
	type TerminalScenarioSuggestion,
	type WorkspaceVM
} from './types.js';
import {
	TERMINAL_GONE,
	TERMINAL_NUMBER_FIELDS,
	TERMINAL_SAVE_FAILED,
	TERMINAL_TICKER_PROBLEM,
	autobuysUnavailable,
	currencyCode,
	emptyAutobuyForm,
	emptyFooter,
	isKnownCadence,
	newCreateForm,
	newSuggestion,
	normalizeTerminalTicker,
	scenarioSuggestionVM,
	setSuggestionUnavailable,
	setSuggestionUnusable,
	shareFactsSuggestionVM,
	terminalAutobuysVM,
	terminalFooterVM,
	terminalRowVM,
	terminalRowsVM,
	terminalSampleRow
} from './vm.js';

// Port of norviq-web internal/handlers/terminal*.go. The Go web used a
// separate generated client (terminalapi); these are the same calls by hand.

const CLIENT_TIMEOUT_MS = 15_000;
// The AI lookups run a web search on the backend; stay under its deadline.
const AI_CLIENT_TIMEOUT_MS = 35_000;

export const TERMINAL_SAMPLE_COOKIE = 'nq_terminal_sample_dismissed';
const SAMPLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const TERMINAL_MOVE_FAILED = 'Could not move that row. Try again.';
const MAX_SYMBOL_RUNES = 5;

/** A backend answer: status plus the parsed body (null when not JSON). */
interface Answer<T> {
	status: number;
	data: T | null;
	body: unknown;
}

/** The terminal client call: never throws on a status, only on transport (returns status 0). */
async function call<T>(
	event: RequestEvent,
	method: string,
	path: string,
	input?: unknown,
	opts: RawOptions & { timeout?: number } = {}
): Promise<Answer<T>> {
	const headers: Record<string, string> = { ...(opts.headers ?? {}) };
	let body: string | undefined;
	if (input !== undefined) {
		body = JSON.stringify(input);
		headers['Content-Type'] = 'application/json';
	}
	try {
		const res = await apiFetch(event, method, path, body, {
			...opts,
			headers,
			signal: AbortSignal.timeout(opts.timeout ?? CLIENT_TIMEOUT_MS)
		});
		const text = await res.text();
		let parsed: unknown = text;
		try {
			parsed = text ? JSON.parse(text) : null;
		} catch {
			/* not JSON */
		}
		return { status: res.status, data: res.ok ? (parsed as T) : null, body: parsed };
	} catch (err) {
		console.warn('terminal backend call failed', method, path, err);
		return { status: 0, data: null, body: null };
	}
}

const idempotency = (key: string): Record<string, string> =>
	key ? { 'Idempotency-Key': key } : {};

function reasonOf(body: unknown): string {
	if (
		body &&
		typeof body === 'object' &&
		typeof (body as { reason?: unknown }).reason === 'string'
	) {
		return (body as { reason: string }).reason.trim();
	}
	return '';
}

/** isUpgradeRequired: 403 with code "upgrade_required" (a bare 403 can be a missing scope). */
function isUpgradeRequired(status: number, body: unknown): boolean {
	return (
		status === 403 &&
		!!body &&
		typeof body === 'object' &&
		(body as { code?: unknown }).code === 'upgrade_required'
	);
}

/** terminalWriteProblem: the message for a write's status, "" when it got `want`. */
function terminalWriteProblem(status: number, body: unknown, want: number): string {
	if (status === want) return '';
	if (status === 404) return TERMINAL_GONE;
	if (status === 422 || status === 400) {
		const reason = reasonOf(body);
		if (reason) return reason;
	}
	return TERMINAL_SAVE_FAILED;
}

export async function terminalIsPro(event: RequestEvent): Promise<boolean> {
	return billingIsPro(await loadBillingContext(event));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** terminalIDFrom: the {id} path param as a UUID, or null (Go answers 404). */
export function terminalID(event: RequestEvent): string | null {
	const raw = (event.params as Record<string, string | undefined>).id?.trim() ?? '';
	return UUID.test(raw) ? raw.toLowerCase() : null;
}

export function sampleDismissed(event: RequestEvent): boolean {
	return event.cookies.get(TERMINAL_SAMPLE_COOKIE) === '1';
}

/** terminalSessionExpired: the backend rejected the token — clear it and send to login. */
export async function terminalSessionExpired(event: RequestEvent): Promise<never> {
	await event.locals.session.destroy();
	redirect(303, '/login?next=' + encodeURIComponent(event.url.pathname + event.url.search));
}

async function loadSummary(event: RequestEvent): Promise<TerminalPositionsSummaryResponse | null> {
	const res = await call<TerminalPositionsSummaryResponse>(
		event,
		'GET',
		'/v1/terminal-positions/summary'
	);
	if (!res.data) {
		if (res.status) console.warn('terminal summary', res.status);
		return null;
	}
	return res.data;
}

async function listPositions(event: RequestEvent) {
	return call<TerminalPositionsListResponse>(event, 'GET', '/v1/terminal-positions');
}

function emptyWorkspace(isPro: boolean, create: CreateFormVM): WorkspaceVM {
	return {
		loadError: false,
		currency: '',
		currencySymbol: '',
		rows: [],
		footer: emptyFooter,
		showSample: false,
		sample: null,
		create,
		notice: '',
		isPro
	};
}

/**
 * fillTerminalWorkspace: loads rows and footer totals. Returns the list call's
 * status (0 when it never completed) alongside the view model.
 */
export async function loadWorkspace(
	event: RequestEvent,
	isPro: boolean,
	create: CreateFormVM
): Promise<{ vm: WorkspaceVM; status: number }> {
	const vm = emptyWorkspace(isPro, create);
	const res = await listPositions(event);
	if (!res.data) {
		console.warn('list terminal positions', res.status);
		vm.loadError = true;
		return { vm, status: res.status };
	}
	vm.currency = res.data.currency;
	vm.currencySymbol = currencySymbol(vm.currency);
	vm.rows = terminalRowsVM(res.data.positions ?? [], vm.currency, isPro);
	vm.showSample = vm.rows.length === 0 && !sampleDismissed(event);
	if (vm.showSample) vm.sample = terminalSampleRow(vm.currency);
	const summary = await loadSummary(event);
	if (summary) vm.footer = terminalFooterVM(summary);
	return { vm, status: res.status };
}

/** loadTerminalAutobuys: best effort; the table works without the panel. */
export async function loadAutobuys(event: RequestEvent): Promise<AutobuysVM> {
	const res = await call<AutobuysListResponse>(event, 'GET', '/v1/autobuys');
	if (!res.data) {
		console.warn('list autobuys', res.status);
		return autobuysUnavailable();
	}
	return terminalAutobuysVM(res.data, crypto.randomUUID());
}

/** renderTerminalWorkspace: reload rows and totals, then let `mutate` set form state / notice. */
async function workspaceAnswer(event: RequestEvent, mutate?: (vm: WorkspaceVM) => void) {
	const isPro = await terminalIsPro(event);
	const { vm } = await loadWorkspace(event, isPro, newCreateForm('', crypto.randomUUID()));
	mutate?.(vm);
	return json(vm);
}

async function readForm(event: RequestEvent): Promise<FormData> {
	try {
		return await event.request.formData();
	} catch {
		return new FormData();
	}
}

const formGet = (form: FormData, name: string) => String(form.get(name) ?? '');

// ---------------------------------------------------------------------------
// Rows

/** parseTerminalCreateForm: validates the create form; zero/negative scenarios still save. */
function parseCreateForm(form: FormData): {
	vm: CreateFormVM;
	body: Record<string, unknown>;
	problem: string;
} {
	const vm: CreateFormVM = {
		open: false,
		ticker: formGet(form, 'ticker').trim(),
		terminalShareCount: formGet(form, 'terminalShareCount').trim(),
		terminalMarketCap: formGet(form, 'terminalMarketCap').trim(),
		valueWanted: formGet(form, 'valueWanted').trim(),
		sharesOwned: formGet(form, 'sharesOwned').trim(),
		idempotencyKey: formGet(form, 'idempotency_key').trim(),
		error: ''
	};
	if (vm.idempotencyKey === '') vm.idempotencyKey = crypto.randomUUID();
	const [ticker, ok] = normalizeTerminalTicker(vm.ticker);
	if (!ok) return { vm, body: {}, problem: TERMINAL_TICKER_PROBLEM };
	const count = parseAmount(vm.terminalShareCount);
	if (!count.ok) return { vm, body: {}, problem: 'Terminal share count needs a number.' };
	const cap = parseAmount(vm.terminalMarketCap);
	if (!cap.ok) return { vm, body: {}, problem: 'Terminal market cap needs a number.' };
	const wanted = parseAmount(vm.valueWanted);
	if (!wanted.ok) return { vm, body: {}, problem: 'Value wanted needs a number.' };
	const body: Record<string, unknown> = {
		ticker,
		terminalShareCount: count.value,
		terminalMarketCap: cap.value,
		valueWanted: wanted.value
	};
	if (vm.sharesOwned !== '') {
		const owned = parseAmount(vm.sharesOwned);
		if (!owned.ok) return { vm, body, problem: 'Shares owned needs a number.' };
		body.sharesOwned = owned.value;
	}
	return { vm, body, problem: '' };
}

/** POST /terminal/positions (TerminalPositionCreate). */
export async function createPosition(event: RequestEvent) {
	const form = await readForm(event);
	const parsed = parseCreateForm(form);
	let problem = parsed.problem;
	if (problem === '') {
		const res = await call(event, 'POST', '/v1/terminal-positions', parsed.body, {
			headers: idempotency(parsed.vm.idempotencyKey)
		});
		problem =
			res.status === 0 ? TERMINAL_SAVE_FAILED : terminalWriteProblem(res.status, res.body, 201);
	}
	return workspaceAnswer(event, (vm) => {
		if (problem !== '') vm.create = { ...parsed.vm, open: true, error: problem };
	});
}

/** POST /terminal/positions/{id}/duplicate. */
export async function duplicatePosition(event: RequestEvent, id: string) {
	const res = await call(event, 'POST', `/v1/terminal-positions/${id}/duplicate`);
	const notice = res.status === 201 && res.data ? '' : 'Could not duplicate that row. Try again.';
	if (notice) console.warn('duplicate terminal position', res.status);
	return workspaceAnswer(event, (vm) => (vm.notice = notice));
}

/** DELETE /terminal/positions/{id}: a 404 is the outcome asked for. */
export async function deletePosition(event: RequestEvent, id: string) {
	const res = await call(event, 'DELETE', `/v1/terminal-positions/${id}`);
	const notice =
		res.status === 204 || res.status === 404 ? '' : 'Could not delete that row. Try again.';
	if (notice) console.warn('delete terminal position', res.status);
	return workspaceAnswer(event, (vm) => (vm.notice = notice));
}

/** moveIndex: items with i swapped one step up/down, or null at an edge or for a bad dir. */
export function moveIndex<T>(items: T[], i: number, dir: string): T[] | null {
	const j = dir === 'down' ? i + 1 : i - 1;
	if ((dir !== 'up' && dir !== 'down') || i < 0 || i >= items.length || j < 0 || j >= items.length)
		return null;
	const out = items.slice();
	[out[i], out[j]] = [out[j], out[i]];
	return out;
}

/** POST /terminal/positions/{id}/move: sends the full new order. */
export async function movePosition(event: RequestEvent, id: string) {
	const form = await readForm(event);
	const dir = formGet(form, 'dir');
	let notice = '';
	const list = await listPositions(event);
	if (!list.data) {
		console.warn('list terminal positions for a move', list.status);
		notice = TERMINAL_MOVE_FAILED;
	} else {
		const ids = (list.data.positions ?? []).map((p) => p.id);
		const order = moveIndex(
			ids,
			ids.findIndex((x) => String(x).toLowerCase() === id),
			dir
		);
		if (order) {
			const put = await call(event, 'PUT', '/v1/terminal-positions/order', { ids: order });
			if (put.status !== 200 || !put.data) {
				console.warn('reorder terminal positions', put.status);
				notice = TERMINAL_MOVE_FAILED;
			}
		}
	}
	return workspaceAnswer(event, (vm) => (vm.notice = notice));
}

/** POST /terminal/sample/dismiss: a cookie, since the sample is never stored. */
export async function dismissSample(event: RequestEvent) {
	event.cookies.set(TERMINAL_SAMPLE_COOKIE, '1', {
		path: '/terminal',
		maxAge: SAMPLE_COOKIE_MAX_AGE,
		httpOnly: true,
		sameSite: 'lax',
		secure: event.url.protocol === 'https:'
	});
	return workspaceAnswer(event, (vm) => {
		vm.showSample = false;
		vm.sample = null;
	});
}

/** parseTerminalUpdateForm: a PATCH that changes exactly the cells the form carried. */
function parseUpdateForm(form: FormData): { body: Record<string, unknown>; problem: string } {
	const body: Record<string, unknown> = {};
	if (form.has('ticker')) {
		const [ticker, ok] = normalizeTerminalTicker(formGet(form, 'ticker'));
		if (!ok) return { body, problem: TERMINAL_TICKER_PROBLEM };
		body.ticker = ticker;
	}
	const cleared: string[] = [];
	for (const field of TERMINAL_NUMBER_FIELDS) {
		if (!form.has(field.name)) continue;
		const raw = formGet(form, field.name).trim();
		if (raw === '' && field.nullable) {
			cleared.push(field.name);
			continue;
		}
		const v = parseAmount(raw);
		if (!v.ok) return { body, problem: field.label + ' needs a number.' };
		body[field.name] = v.value;
	}
	if (cleared.length > 0) body.clear = cleared;
	return { body, problem: '' };
}

/** terminalEditedFields: the row fields the form carried, in a fixed order. */
function editedFields(form: FormData): string[] {
	const fields: string[] = [];
	if (form.has('ticker')) fields.push('ticker');
	for (const field of TERMINAL_NUMBER_FIELDS) if (form.has(field.name)) fields.push(field.name);
	return fields;
}

/** findTerminalPosition: re-read a row; `known` is false when the list call failed. */
async function findPosition(
	event: RequestEvent,
	id: string
): Promise<{ row: TerminalPositionResponse | null; currency: string; known: boolean }> {
	const res = await listPositions(event);
	if (!res.data) {
		console.warn('terminal row re-read', res.status);
		return { row: null, currency: '', known: false };
	}
	const row = (res.data.positions ?? []).find((p) => String(p.id).toLowerCase() === id) ?? null;
	return { row, currency: res.data.currency, known: true };
}

/**
 * PATCH /terminal/positions/{id} (TerminalPositionUpdate). Go answered with
 * out-of-band slots for the edited fields, the derived values, the error and
 * the footer; this answers the same data as JSON and the row component
 * updates exactly those slots.
 */
export async function updatePosition(event: RequestEvent, id: string) {
	const form = await readForm(event);
	const { body, problem: parseProblem } = parseUpdateForm(form);
	let problem = parseProblem;
	let saved: TerminalPositionResponse | null = null;
	if (problem === '') {
		const res = await call<TerminalPositionResponse>(
			event,
			'PATCH',
			`/v1/terminal-positions/${id}`,
			body
		);
		if (res.status === 0) problem = TERMINAL_SAVE_FAILED;
		else if (res.status === 200 && res.data) saved = res.data;
		else problem = terminalWriteProblem(res.status, res.body, 200);
	}
	const summary = await loadSummary(event);
	let code = summary?.currency ?? '';
	if (saved && !summary) code = (await findPosition(event, id)).currency;
	if (!saved) {
		const found = await findPosition(event, id);
		if (code === '') code = found.currency;
		if (!found.known) {
			console.warn('terminal row re-read failed', id);
			return json({ kind: 'unknown' } satisfies RowEditResult);
		}
		saved = found.row;
	}
	if (!saved) return json({ kind: 'gone' } satisfies RowEditResult);
	const row = terminalRowVM(saved, code, await terminalIsPro(event));
	row.fieldError = problem;
	row.isFirst = formGet(form, 'isFirst') === 'true';
	row.isLast = formGet(form, 'isLast') === 'true';
	const result: RowEditResult = {
		kind: 'edit',
		row,
		fields: editedFields(form),
		clearSuggestion: problem === '',
		footer: summary ? terminalFooterVM(summary) : null
	};
	return json(result);
}

// ---------------------------------------------------------------------------
// AI suggestions

/**
 * terminalAISuggest: every outcome is a message for the reader. Non-Pro
 * readers get the upgrade prompt without a backend call; missing consent gets
 * the in-place consent card (RenderAIConsentRequired's partial branch).
 */
export async function aiSuggest(event: RequestEvent, id: string, kind: 'facts' | 'scenario') {
	const form = await readForm(event);
	const vm = newSuggestion(id, kind, '');
	const [ticker, valid] = normalizeTerminalTicker(formGet(form, 'ticker'));
	vm.ticker = ticker;
	let symbol = formGet(form, 'symbol');
	if ([...symbol].length > MAX_SYMBOL_RUNES) symbol = '';
	const tableCurrency = currencyCode(formGet(form, 'currency'));
	const consent = (): Response =>
		json({ kind: 'consent', next: aiConsentReturnPath(event) } satisfies SuggestionResult);

	if (!valid) {
		vm.state = SuggestionState.Invalid;
		vm.message = 'Set a ticker on this row first.';
	} else if (!(await terminalIsPro(event))) {
		vm.state = SuggestionState.Upgrade;
	} else if (!(await hasAIConsent(event))) {
		return consent();
	} else {
		const path =
			kind === 'facts'
				? '/v1/terminal-positions/ai/share-facts'
				: '/v1/terminal-positions/ai/scenario';
		const res = await call<ShareFactsSuggestion | TerminalScenarioSuggestion>(
			event,
			'POST',
			path,
			{ ticker },
			{ timeout: AI_CLIENT_TIMEOUT_MS }
		);
		if (res.status === 0) {
			setSuggestionUnavailable(vm);
		} else if (res.status === 200 && res.data) {
			if (kind === 'facts')
				shareFactsSuggestionVM(vm, res.data as ShareFactsSuggestion, symbol, tableCurrency);
			else scenarioSuggestionVM(vm, res.data as TerminalScenarioSuggestion, symbol);
		} else if (isAIConsentRequired(apiErrorFrom(res))) {
			return consent();
		} else if (isUpgradeRequired(res.status, res.body)) {
			vm.state = SuggestionState.Upgrade;
		} else if (res.status === 422) {
			setSuggestionUnusable(vm);
		} else {
			setSuggestionUnavailable(vm);
		}
	}
	return json({ kind: 'suggestion', vm } satisfies SuggestionResult);
}

function apiErrorFrom(res: Answer<unknown>): APIError {
	const b = (res.body && typeof res.body === 'object' ? res.body : {}) as {
		reason?: string;
		error?: unknown;
		code?: string;
	};
	const reason = (b.reason ?? (typeof b.error === 'string' ? b.error : '')).trim();
	return new APIError(res.status, reason, b.code, res.body);
}

// ---------------------------------------------------------------------------
// Autobuys

const PERCENT_MAX = 100;

interface AutobuyInput {
	label: string;
	ticker: string;
	amount: number;
	cadence: string;
	percent: number | null;
}

/** parseAutobuyForm: validates the add/edit form. */
function parseAutobuyForm(form: FormData): {
	vm: AutobuyFormVM;
	input: AutobuyInput;
	problem: string;
} {
	const vm: AutobuyFormVM = {
		...emptyAutobuyForm(),
		label: formGet(form, 'label').trim(),
		ticker: formGet(form, 'ticker').trim(),
		amount: formGet(form, 'amount').trim(),
		cadence: formGet(form, 'cadence').trim(),
		percent: formGet(form, 'percent').trim(),
		idempotencyKey: formGet(form, 'idempotency_key').trim()
	};
	const input: AutobuyInput = {
		label: vm.label,
		ticker: '',
		amount: 0,
		cadence: vm.cadence,
		percent: null
	};
	if (input.label === '') return { vm, input, problem: 'Give this autobuy a name.' };
	if (!isKnownCadence(input.cadence)) return { vm, input, problem: 'Pick how often it buys.' };
	if (vm.ticker !== '') {
		const [ticker, ok] = normalizeTerminalTicker(vm.ticker);
		if (!ok) return { vm, input, problem: TERMINAL_TICKER_PROBLEM };
		input.ticker = ticker;
	}
	const isPercent = input.cadence === Cadence.Percent;
	const amount = parseAmount(vm.amount);
	if (!amount.ok && amount.error === ErrEmpty && isPercent) input.amount = 0;
	else if (!amount.ok || amount.value < 0)
		return { vm, input, problem: 'Enter an amount of zero or more.' };
	else input.amount = amount.value;
	if (isPercent) {
		const pct = parseAmount(vm.percent.trim().replace(/%$/, ''));
		if (!pct.ok || pct.value <= 0 || pct.value > PERCENT_MAX)
			return { vm, input, problem: 'Enter a percent between 0 and 100.' };
		input.percent = pct.value / PERCENT_MAX;
	}
	return { vm, input, problem: '' };
}

/** renderAutobuysPanel: reload the panel, then let `mutate` set form state / notice. */
async function autobuysAnswer(event: RequestEvent, mutate?: (vm: AutobuysVM) => void) {
	const vm = await loadAutobuys(event);
	if (mutate && !vm.loadError) mutate(vm);
	return json(vm);
}

/** POST /terminal/autobuys (TerminalAutobuyCreate). */
export async function createAutobuy(event: RequestEvent) {
	const form = await readForm(event);
	const { vm: formVM, input, problem: parseProblem } = parseAutobuyForm(form);
	let problem = parseProblem;
	if (problem === '') {
		const body: Record<string, unknown> = {
			label: input.label,
			amount: input.amount,
			cadence: input.cadence,
			active: true
		};
		if (input.percent != null) body.percent = input.percent;
		if (input.ticker !== '') body.ticker = input.ticker;
		const res = await call(event, 'POST', '/v1/autobuys', body, {
			headers: idempotency(formVM.idempotencyKey)
		});
		problem =
			res.status === 0 ? TERMINAL_SAVE_FAILED : terminalWriteProblem(res.status, res.body, 201);
	}
	return autobuysAnswer(event, (vm) => {
		if (problem !== '') vm.form = { ...formVM, error: problem };
	});
}

/** PATCH /terminal/autobuys/{id}: an emptied ticker / non-percent cadence clears them. */
export async function updateAutobuy(event: RequestEvent, id: string) {
	const form = await readForm(event);
	const { vm: formVM, input, problem: parseProblem } = parseAutobuyForm(form);
	formVM.id = id;
	let problem = parseProblem;
	if (problem === '') {
		const body: Record<string, unknown> = {
			label: input.label,
			amount: input.amount,
			cadence: input.cadence
		};
		const cleared: string[] = [];
		if (input.ticker !== '') body.ticker = input.ticker;
		else cleared.push('ticker');
		if (input.percent != null) body.percent = input.percent;
		else cleared.push('percent');
		if (cleared.length > 0) body.clear = cleared;
		const res = await call(event, 'PATCH', `/v1/autobuys/${id}`, body);
		problem =
			res.status === 0 ? TERMINAL_SAVE_FAILED : terminalWriteProblem(res.status, res.body, 200);
	}
	return autobuysAnswer(event, (vm) => {
		if (problem !== '') {
			vm.editingID = id;
			vm.editForm = { ...formVM, error: problem };
		}
	});
}

/** POST /terminal/autobuys/{id}/active: a missing "active" means off. */
export async function setAutobuyActive(event: RequestEvent, id: string) {
	const form = await readForm(event);
	const active = formGet(form, 'active') === 'true';
	const res = await call(event, 'PATCH', `/v1/autobuys/${id}`, { active });
	const notice =
		res.status === 0 ? TERMINAL_SAVE_FAILED : terminalWriteProblem(res.status, res.body, 200);
	if (notice) console.warn('set autobuy active', res.status);
	return autobuysAnswer(event, (vm) => (vm.notice = notice));
}

/** DELETE /terminal/autobuys/{id}: a 404 means it is already gone. */
export async function deleteAutobuy(event: RequestEvent, id: string) {
	const res = await call(event, 'DELETE', `/v1/autobuys/${id}`);
	const notice =
		res.status === 204 || res.status === 404 ? '' : 'Could not delete that autobuy. Try again.';
	if (notice) console.warn('delete autobuy', res.status);
	return autobuysAnswer(event, (vm) => (vm.notice = notice));
}
