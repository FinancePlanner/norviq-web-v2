import type { RequestEvent } from '@sveltejs/kit';
import { apiFetch, apiJSON } from '#lib/server/api.js';
import { formAll, formString, parseOptionalFloat, validUUID } from './common.server.js';
import type {
	ScreenMetricDescriptor,
	ScreensVM,
	WatchlistListResponse,
	WatchlistScreen,
	WatchlistScreenCondition,
	WatchlistScreenEvaluation,
	WatchlistScreenGroup,
	WatchlistScreenUpsertRequest
} from './types.js';

// Port of handlers/wealth_automation.go: SmartScreens … SmartScreenEvaluate,
// screenRequestFromForm.

async function get<T>(event: RequestEvent, path: string): Promise<T | null> {
	try {
		return await apiJSON<T>(event, 'GET', path);
	} catch {
		return null;
	}
}

/** SmartScreens view model. */
export async function loadScreensVM(event: RequestEvent): Promise<ScreensVM> {
	const vm: ScreensVM = {
		lists: [],
		screens: [],
		catalog: [],
		evaluation: null,
		editing: null,
		history: [],
		historyScreenID: '',
		error: ''
	};
	const q = event.url.searchParams;
	const evaluated = q.get('evaluated') ?? '';
	const evaluatedID = evaluated ? validUUID(evaluated) : null;
	const editID = validUUID(q.get('edit'));
	const historyID = validUUID(q.get('history'));

	const [lists, screens, catalog, evaluations, editing, history] = await Promise.all([
		get<WatchlistListResponse[]>(event, '/v1/watchlist/lists'),
		get<WatchlistScreen[]>(event, '/v1/watchlist/screens'),
		get<ScreenMetricDescriptor[]>(event, '/v1/watchlist/screens/catalog'),
		evaluatedID
			? get<WatchlistScreenEvaluation[]>(event, `/v1/watchlist/screens/${evaluatedID}/history`)
			: null,
		editID ? get<WatchlistScreen>(event, `/v1/watchlist/screens/${editID}`) : null,
		historyID
			? get<WatchlistScreenEvaluation[]>(event, `/v1/watchlist/screens/${historyID}/history`)
			: null
	]);
	if (lists) vm.lists = lists;
	if (screens) vm.screens = screens;
	else vm.error = 'Could not load smart screens.';
	if (catalog) vm.catalog = catalog;
	if (evaluations && evaluations.length > 0) vm.evaluation = evaluations[0];
	if (editing) vm.editing = editing;
	if (history && historyID) {
		vm.history = history;
		vm.historyScreenID = historyID;
	}
	return vm;
}

export class ScreenFormError extends Error {}

const PERIODS = new Set(['ttm', 'annual', 'quarterly']);
const COMPARISONS = new Set(['improving', 'deteriorating', 'greater_than', 'less_than']);
const operator = (raw: string): 'all' | 'any' => (raw === 'all' || raw === 'any' ? raw : 'all');
const newClientID = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

/** screenRequestFromForm */
export function screenRequestFromForm(form: FormData): WatchlistScreenUpsertRequest {
	const name = formString(form, 'name').trim();
	if (name === '') throw new ScreenFormError('name is required');
	let listIDs = formAll(form, 'list_ids');
	if (listIDs.length === 0 && formString(form, 'list_id') !== '')
		listIDs = [formString(form, 'list_id')];
	if (listIDs.length === 0) throw new ScreenFormError('choose at least one watchlist');
	for (const id of listIDs) if (!validUUID(id)) throw new ScreenFormError('invalid watchlist');

	const metrics = formAll(form, 'condition_metric');
	const periods = formAll(form, 'condition_period');
	const comparisons = formAll(form, 'condition_comparison');
	const values = formAll(form, 'condition_value');
	const groupIndexes = formAll(form, 'condition_group');
	const groups = new Map<number, WatchlistScreenCondition[]>();
	metrics.forEach((rawMetric, index) => {
		const metric = rawMetric.trim();
		if (metric === '') return;
		if (index >= periods.length || index >= comparisons.length || index >= groupIndexes.length) {
			throw new ScreenFormError('incomplete screen condition');
		}
		const groupIndex = /^[+-]?\d+$/.test(groupIndexes[index]) ? Number(groupIndexes[index]) : NaN;
		if (!Number.isInteger(groupIndex) || groupIndex < 1 || groupIndex > 10)
			throw new ScreenFormError('invalid condition group');
		const period = periods[index];
		if (!PERIODS.has(period)) throw new ScreenFormError('invalid condition period');
		const comparison = comparisons[index];
		if (!COMPARISONS.has(comparison)) throw new ScreenFormError('invalid condition comparison');
		let value: number | undefined;
		if (index < values.length) {
			const parsed = parseOptionalFloat(values[index]);
			if (parsed.error) throw new ScreenFormError('condition value must be a number');
			value = parsed.value;
		}
		if ((comparison === 'greater_than' || comparison === 'less_than') && value === undefined) {
			throw new ScreenFormError('numeric comparisons require a value');
		}
		const condition: WatchlistScreenCondition = {
			id: newClientID('condition'),
			metric,
			period: period as WatchlistScreenCondition['period'],
			comparison
		};
		if (value !== undefined) condition.value = value;
		groups.set(groupIndex, [...(groups.get(groupIndex) ?? []), condition]);
	});
	if (groups.size === 0) throw new ScreenFormError('add at least one condition');
	const resultGroups: WatchlistScreenGroup[] = [...groups.keys()]
		.sort((a, b) => a - b)
		.map((key) => ({
			id: newClientID('group'),
			logicalOperator: operator(formString(form, `group_operator_${key}`)),
			conditions: groups.get(key)!
		}));
	return {
		name,
		alertsEnabled: form.get('alerts') === 'on',
		logicalOperator: operator(formString(form, 'logical_operator')),
		watchlistListIds: listIDs,
		groups: resultGroups
	};
}

/** Backend call that succeeds only on the exact status the Go client's JSON200/204 check expected. */
export async function callExpect(
	event: RequestEvent,
	method: string,
	path: string,
	expect: number,
	body?: unknown
): Promise<boolean> {
	try {
		const res = await apiFetch(
			event,
			method,
			path,
			body === undefined ? null : JSON.stringify(body),
			{
				headers: body === undefined ? {} : { 'Content-Type': 'application/json' }
			}
		);
		await res.body?.cancel();
		return res.status === expect;
	} catch {
		return false;
	}
}
