import { formatFloat } from '#lib/format.js';
import type { Option } from '#lib/components/norviq/types.js';
import type {
	AllocationTargetBucket,
	PortfolioListResponse,
	RebalanceTrade,
	RebalancingPolicy,
	RebalancingViewModel,
	ScreenMetricDescriptor,
	WatchlistListResponse,
	WatchlistScreen
} from './types.js';

// Helpers from pages/portfolio/rebalancing.templ and pages/automation
// (page.templ, options.go), same names and output.

/** Go uuid.UUID.String() is lower-case; the backend emits upper-case. */
export const uuidString = (id: string | null | undefined) => (id ?? '').toLowerCase();

/** money: "%s %.2f" */
export const money = (value: number, currency: string) =>
	`${currency} ${formatFloat(value ?? 0, 2)}`;
export const basisPoints = (value: number) => formatFloat((value ?? 0) / 100, 2) + '%';
export const signedBasisPoints = (value: number) =>
	value > 0 ? '+' + basisPoints(value) : basisPoints(value);
export const signedTradeAmount = (trade: RebalanceTrade) =>
	trade.side === 'sell' ? -trade.notional : trade.notional;
export const fixed = (value: number, prec: number) => formatFloat(value ?? 0, prec);

export function severityLabel(value: string): string {
	switch (value) {
		case 'balanced':
			return 'Within target';
		case 'warning':
			return 'Approaching threshold';
		case 'breached':
			return 'Threshold exceeded';
		default:
			return 'Unavailable';
	}
}

export function driftTone(value: string): string {
	switch (value) {
		case 'balanced':
			return 'text-success';
		case 'warning':
			return 'text-warning';
		case 'breached':
			return 'text-danger';
		default:
			return 'opacity-55';
	}
}

export function driftBadge(value: string): string {
	switch (value) {
		case 'balanced':
			return 'bg-success/10 text-success';
		case 'warning':
			return 'bg-warning/10 text-warning';
		case 'breached':
			return 'bg-danger/10 text-danger';
		default:
			return 'bg-current/5';
	}
}

export const defaultPlanName = (value: string | undefined) =>
	(value ?? '').trim() === '' ? 'Rebalancing plan' : (value as string);

export function groupingOptionList(selected: string): Option[] {
	return [
		{ value: 'holding', label: 'Holdings', selected: selected === 'holding' },
		{ value: 'sector', label: 'Sectors', selected: selected === 'sector' },
		{ value: 'custom', label: 'Custom groups', selected: selected === 'custom' }
	];
}

export function editorBuckets(vm: RebalancingViewModel): AllocationTargetBucket[] {
	if (vm.overview.model) return vm.overview.model.buckets ?? [];
	return [
		{
			id: 'bucket-stocks',
			name: 'Stocks',
			targetBasisPoints: 6000,
			sortOrder: 0,
			leaves: [
				{
					id: 'leaf-vti',
					kind: 'security',
					symbol: 'VTI',
					name: 'US total market',
					targetBasisPoints: 6000,
					sortOrder: 0
				}
			]
		},
		{
			id: 'bucket-bonds',
			name: 'Bonds',
			targetBasisPoints: 4000,
			sortOrder: 0,
			leaves: [
				{
					id: 'leaf-bnd',
					kind: 'security',
					symbol: 'BND',
					name: 'US bonds',
					targetBasisPoints: 4000,
					sortOrder: 0
				}
			]
		}
	];
}

export const editorName = (vm: RebalancingViewModel) =>
	vm.overview.model?.name ?? 'Core allocation';
export const editorGrouping = (vm: RebalancingViewModel) =>
	vm.overview.model?.groupingMode ?? 'custom';
export const editorMinimumTrade = (vm: RebalancingViewModel) =>
	vm.overview.model ? vm.overview.model.minimumTradeAmount : 10;
export const editorAssetThreshold = (vm: RebalancingViewModel) =>
	vm.overview.model ? vm.overview.model.defaultTargetThresholdBasisPoints / 100 : 5;
export const editorTotalThreshold = (vm: RebalancingViewModel) =>
	vm.overview.model ? vm.overview.model.totalThresholdBasisPoints / 100 : 3;
export const editorFractional = (vm: RebalancingViewModel) =>
	!vm.overview.model || vm.overview.model.fractionalSharesEnabled;
export const editorFlatFee = (vm: RebalancingViewModel) =>
	vm.overview.model ? vm.overview.model.flatFee : 0;

// ---- pages/automation (smart screens, rebalancing rules)

/** decimal: "" for nil, else "%.2f" */
export const decimal = (value: number | null | undefined) =>
	value === null || value === undefined ? '' : formatFloat(value, 2);
export const percentValue = (value: number) => formatFloat(value * 100, 2);

export function targetText(policy: RebalancingPolicy | null): string {
	if (!policy) return '';
	return (policy.targets ?? [])
		.map((t) => `${t.symbol ?? 'cash'}:${formatFloat(t.targetWeight * 100, 2)}`)
		.join(',');
}
export const policyCurrency = (policy: RebalancingPolicy | null) =>
	policy ? policy.baseCurrency : 'EUR';
export const policyCadence = (policy: RebalancingPolicy | null) =>
	policy ? policy.cadence : 'quarterly';
export const policyDrift = (policy: RebalancingPolicy | null) =>
	!policy || policy.driftThreshold === null || policy.driftThreshold === undefined
		? '5'
		: percentValue(policy.driftThreshold);
export const policyEnabled = (policy: RebalancingPolicy | null) => !policy || policy.enabled;

export const screenAction = (screen: WatchlistScreen | null) =>
	screen ? '/portfolio/screens/' + screen.id : '/portfolio/screens';
export const screenName = (screen: WatchlistScreen | null) =>
	screen ? screen.name : 'Improving fundamentals';
export const screenAlerts = (screen: WatchlistScreen | null) => !screen || screen.alertsEnabled;
export const screenOperator = (screen: WatchlistScreen | null) =>
	screen ? screen.logicalOperator : 'all';
/** Exact comparison, as Go did: list option ids are lower-case, the screen's ids are the backend's. */
export const screenListSelected = (screen: WatchlistScreen | null, id: string) =>
	!!screen && (screen.watchlistListIds ?? []).includes(id);
export const screenSubmitLabel = (screen: WatchlistScreen | null) =>
	screen ? 'Update screen' : 'Create screen';
export const screenEditorTitle = (screen: WatchlistScreen | null) =>
	screen ? 'Edit screen' : 'New screen';
export const screenGroupOperator = (screen: WatchlistScreen | null, index: number) =>
	screen && (screen.groups ?? []).length > index ? screen.groups[index].logicalOperator : 'all';

export function portfolioOptions(
	items: PortfolioListResponse[],
	isSelected: (id: string) => boolean,
	blankLabel: string
): Option[] {
	const opts: Option[] = [];
	if (blankLabel) opts.push({ value: '', label: blankLabel });
	for (const item of items) {
		const id = uuidString(item.id);
		opts.push({ value: id, label: item.name, selected: isSelected(id) });
	}
	return opts;
}

export function listOptions(
	lists: WatchlistListResponse[],
	isSelected: (id: string) => boolean
): Option[] {
	return lists.map((l) => {
		const id = uuidString(l.id);
		return { value: id, label: l.name, selected: isSelected(id) };
	});
}

/** metricOptions leads with the blank "Unused row" entry. */
export function metricOptions(catalog: ScreenMetricDescriptor[], selected: string): Option[] {
	return [
		{ value: '', label: 'Unused row', selected: selected === '' },
		...catalog.map((m) => ({ value: m.id, label: m.label, selected: m.id === selected }))
	];
}
