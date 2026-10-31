import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import {
	formAll,
	formChoice,
	formString,
	parseFloatGo,
	parseIntGo,
	portfolioAPIErrorMessage
} from './common.server.js';
import type {
	AllocationModel,
	AllocationModelUpsertRequest,
	AllocationTargetBucket,
	ManagedPortfolio,
	PortfolioPage,
	RebalancePlan,
	RebalanceTradeOverride,
	RebalancingAlert,
	RebalancingHistorySummary,
	RebalancingNotificationPreferences,
	RebalancingOverview,
	RebalancingSimulationRequest,
	RebalancingViewModel
} from './types.js';

// Port of handlers/rebalancing.go.

/** rebalancingBase */
export const rebalancingBase = (portfolioID: string) =>
	`/v1/portfolios/${encodeURIComponent(portfolioID)}/rebalancing`;

/** redirectRebalancing target. */
export function rebalancingURL(portfolioID: string, message: string, isError: boolean): string {
	const q = new URLSearchParams({ portfolio: portfolioID });
	q.set(isError ? 'error' : 'notice', message);
	return '/portfolio/rebalancing?' + q.toString();
}

const emptyOverview = (): RebalancingOverview => ({
	portfolioId: '',
	model: null,
	baseCurrency: '',
	totalValue: 0,
	totalDriftBasisPoints: 0,
	severity: '',
	priceQuality: '',
	openAlertCount: 0,
	rows: [],
	warnings: []
});

export function emptyRebalancingVM(url: URL): RebalancingViewModel {
	return {
		portfolios: [],
		selected: null,
		overview: emptyOverview(),
		models: [],
		simulation: null,
		plans: [],
		history: {
			completedCount: 0,
			averageDriftBeforeBasisPoints: 0,
			averageDriftAfterBasisPoints: 0
		},
		alerts: [],
		preferences: { portfolioId: '', pushEnabled: false },
		cashFlow: 0,
		notice: url.searchParams.get('notice') ?? '',
		error: url.searchParams.get('error') ?? ''
	};
}

export const findPortfolio = (items: ManagedPortfolio[], id: string) =>
	items.find((p) => p.id === id) ?? null;

/** loadRebalancingViewModel */
export async function loadRebalancingViewModel(event: RequestEvent): Promise<RebalancingViewModel> {
	const vm = emptyRebalancingVM(event.url);
	let page: PortfolioPage;
	try {
		page = await apiJSON<PortfolioPage>(event, 'GET', '/v1/portfolios');
	} catch (err) {
		vm.error = portfolioAPIErrorMessage(err, 'Could not load portfolios.');
		return vm;
	}
	vm.portfolios = page?.items ?? [];
	let selectedID = (event.url.searchParams.get('portfolio') ?? '').trim();
	if (selectedID === '' && vm.portfolios.length > 0) selectedID = vm.portfolios[0].id;
	vm.selected = findPortfolio(vm.portfolios, selectedID);
	if (!vm.selected) return vm;
	await loadRebalancingData(event, vm);
	return vm;
}

/** loadRebalancingData: overview is required; the rest degrade silently. */
export async function loadRebalancingData(
	event: RequestEvent,
	vm: RebalancingViewModel
): Promise<void> {
	const base = rebalancingBase(vm.selected!.id);
	try {
		vm.overview = {
			...emptyOverview(),
			...(await apiJSON<RebalancingOverview>(event, 'GET', base + '/overview'))
		};
	} catch (err) {
		vm.error = portfolioAPIErrorMessage(err, 'Could not load drift data.');
		return;
	}
	const opt = async <T>(path: string, fallback: T): Promise<T> => {
		try {
			return (await apiJSON<T>(event, 'GET', path)) ?? fallback;
		} catch {
			return fallback;
		}
	};
	const [models, plans, history, preferences, alerts] = await Promise.all([
		opt<AllocationModel[]>(base + '/models', vm.models),
		opt<RebalancePlan[]>(base + '/plans', vm.plans),
		opt<RebalancingHistorySummary>(base + '/history', vm.history),
		opt<RebalancingNotificationPreferences>(base + '/preferences', vm.preferences),
		opt<RebalancingAlert[]>('/v1/rebalancing/alerts', [])
	]);
	vm.models = models;
	vm.plans = plans;
	vm.history = history;
	vm.preferences = preferences;
	vm.alerts = alerts.filter((a) => a.portfolioId === vm.selected!.id && a.status !== 'resolved');
}

/** percentageBasisPoints: int(f*100 + 0.5) */
const percentageBasisPoints = (value: FormDataEntryValue | null | undefined) =>
	Math.trunc(parseFloatGo(value) * 100 + 0.5);

/** formID */
function formID(values: string[], index: number, prefix: string): string {
	if (index < values.length && values[index].trim() !== '') return values[index].trim();
	return `${prefix}-${index + 1}`;
}

export class FormError extends Error {}

/** parseAllocationModelForm */
export function parseAllocationModelForm(form: FormData): AllocationModelUpsertRequest {
	const bucketNames = formAll(form, 'bucketName[]');
	const bucketTargets = formAll(form, 'bucketTarget[]');
	if (bucketNames.length === 0 || bucketNames.length !== bucketTargets.length)
		throw new FormError('add at least one allocation group');
	const bucketIDs = formAll(form, 'bucketId[]');
	const buckets: AllocationTargetBucket[] = [];
	bucketNames.forEach((raw, index) => {
		const name = raw.trim();
		if (name === '') throw new FormError('every allocation group needs a name');
		buckets.push({
			id: formID(bucketIDs, index, 'bucket'),
			name,
			targetBasisPoints: percentageBasisPoints(bucketTargets[index]),
			sortOrder: buckets.length,
			leaves: []
		});
	});
	appendAllocationLeaves(form, buckets);
	const revision = parseIntGo(form.get('revision'));
	const fractional = form.get('fractionalSharesEnabled') === 'on';
	const input: AllocationModelUpsertRequest = {
		name: formString(form, 'name').trim(),
		groupingMode: formChoice(formString(form, 'groupingMode'), 'holding', 'sector', 'custom'),
		activate: true,
		defaultTargetThresholdBasisPoints: percentageBasisPoints(form.get('assetThreshold')),
		totalThresholdBasisPoints: percentageBasisPoints(form.get('totalThreshold')),
		fractionalSharesEnabled: fractional,
		quantityIncrement: fractional ? 0.001 : 1,
		minimumTradeAmount: parseFloatGo(form.get('minimumTradeAmount')),
		flatFee: parseFloatGo(form.get('flatFee')),
		variableFeeBasisPoints: 0,
		buckets
	};
	if (revision > 0) input.expectedRevision = revision;
	return input;
}

function appendAllocationLeaves(form: FormData, buckets: AllocationTargetBucket[]) {
	const groups = formAll(form, 'leafGroup[]');
	const names = formAll(form, 'leafName[]');
	const symbols = formAll(form, 'leafSymbol[]');
	const targets = formAll(form, 'leafTarget[]');
	const kinds = formAll(form, 'leafKind[]');
	const ids = formAll(form, 'leafId[]');
	const n = groups.length;
	if (n !== names.length || n !== symbols.length || n !== targets.length || n !== kinds.length) {
		throw new FormError('allocation rows are incomplete');
	}
	groups.forEach((groupValue, index) => {
		const group = parseIntGo(groupValue);
		if (group < 0 || group >= buckets.length || names[index].trim() === '') return;
		const kind = formChoice(kinds[index], 'security', 'cash');
		const symbol = symbols[index].trim().toUpperCase();
		if (kind === 'security' && symbol === '')
			throw new FormError('every security target needs a ticker');
		const leaves = buckets[group].leaves;
		const leaf = {
			id: formID(ids, index, 'leaf'),
			kind,
			name: names[index].trim(),
			targetBasisPoints: percentageBasisPoints(targets[index]),
			sortOrder: leaves.length
		} as AllocationTargetBucket['leaves'][number];
		// Go's `symbol,omitempty`
		if (symbol) leaf.symbol = symbol;
		leaves.push(leaf);
	});
}

/** parseSimulationForm */
export function parseSimulationForm(form: FormData): RebalancingSimulationRequest {
	const modelID = formString(form, 'modelId').trim();
	const revision = parseIntGo(form.get('modelRevision'));
	if (modelID === '' || revision < 1) throw new FormError('reload the page before building a plan');
	const overrides: RebalanceTradeOverride[] = [];
	const symbols = formAll(form, 'overrideSymbol[]');
	const amounts = formAll(form, 'overrideAmount[]');
	symbols.forEach((symbol, index) => {
		if (index >= amounts.length || symbol.trim() === '') return;
		overrides.push({ symbol: symbol.trim().toUpperCase(), amount: parseFloatGo(amounts[index]) });
	});
	return {
		modelId: modelID,
		modelRevision: revision,
		cashFlow: parseFloatGo(form.get('cashFlow')),
		overrides
	};
}
