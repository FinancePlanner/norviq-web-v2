import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { uuidString } from './format.js';
import { validUUID } from './common.server.js';
import type {
	PortfolioListResponse,
	RebalanceEvent,
	RebalancePreview,
	RebalanceTarget,
	RebalancingPolicy,
	RebalancingRulesVM
} from './types.js';

// Port of handlers/wealth_automation.go RebalancingRules / RebalancingRuleSave /
// updateRebalanceEvent and parseTargets.

export const policyBase = (id: string) => `/v1/portfolio/lists/${id}/rebalancing-policy`;

export async function loadRulesVM(event: RequestEvent): Promise<RebalancingRulesVM> {
	const vm: RebalancingRulesVM = {
		portfolios: [],
		selectedID: event.url.searchParams.get('portfolio') ?? '',
		policy: null,
		preview: null,
		events: [],
		error: ''
	};
	try {
		vm.portfolios =
			(await apiJSON<PortfolioListResponse[]>(event, 'GET', '/v1/portfolio/lists')) ?? [];
		if (vm.selectedID === '' && vm.portfolios.length > 0)
			vm.selectedID = uuidString(vm.portfolios[0].id);
	} catch {
		/* Go ignores a failed list */
	}
	const id = validUUID(vm.selectedID);
	if (id) {
		const [policy, events] = await Promise.all([
			apiJSON<RebalancingPolicy>(event, 'GET', policyBase(id)).catch(() => null),
			apiJSON<RebalanceEvent[]>(event, 'GET', policyBase(id) + '/events').catch(() => null)
		]);
		if (policy) {
			vm.policy = policy;
			vm.preview = await apiJSON<RebalancePreview>(
				event,
				'POST',
				policyBase(id) + '/preview'
			).catch(() => null);
		}
		if (events) vm.events = events;
	}
	return vm;
}

export class TargetsError extends Error {}

/** parseTargets: "AAPL:60,MSFT:30,cash:10" → targets totalling 100%. */
export function parseTargets(raw: string): RebalanceTarget[] {
	const parts = raw.split(',');
	const targets: RebalanceTarget[] = [];
	let total = 0;
	parts.forEach((part, index) => {
		const trimmed = part.trim();
		const at = trimmed.indexOf(':');
		if (at < 0) throw new TargetsError('targets must use SYMBOL:WEIGHT');
		const symbolPart = trimmed.slice(0, at);
		const weightPart = trimmed.slice(at + 1);
		const weight = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(weightPart)
			? Number(weightPart)
			: NaN;
		if (Number.isNaN(weight) || weight <= 0) throw new TargetsError('invalid target weight');
		total += weight;
		const target: RebalanceTarget = {
			id: `target-${index + 1}`,
			kind: 'symbol',
			targetWeight: weight / 100
		};
		if (symbolPart.toLowerCase() === 'cash') target.kind = 'cash';
		else target.symbol = symbolPart.trim().toUpperCase();
		targets.push(target);
	});
	if (total < 99.99 || total > 100.01) throw new TargetsError('target weights must total 100%');
	return targets;
}
