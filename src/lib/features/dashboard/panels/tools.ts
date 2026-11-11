// The dashboard's "Tools and connections" panel: one row per tool, each a
// name, a one-line status and a link. The details live on each tool's page.
import type { MCPStatusVM, TaxPanelVM, TerminalSummaryVM } from './types.js';

export interface ToolRow {
	title: string;
	status: string;
	href: string;
	action: string;
}

export function mcpRow(vm: MCPStatusVM): ToolRow {
	const row = { title: 'MCP connections', href: '/settings/api-access', action: 'Manage' };
	if (vm.loadError) return { ...row, status: 'Status unavailable' };
	if (vm.needsPro)
		return { ...row, status: 'Pro plan', href: '/settings/subscription', action: 'See plans' };
	if (vm.empty) return { ...row, status: 'No tokens yet', action: 'Create token' };
	const count =
		vm.liveCount > 0
			? `${vm.liveCount} live`
			: `${vm.tokenCount} ${vm.tokenCount === 1 ? 'token' : 'tokens'} ready`;
	return { ...row, status: vm.lastActivity ? `${count} · last used ${vm.lastActivity}` : count };
}

/** Null when the summary failed: the row is left out rather than shown broken. */
export function terminalRow(vm: TerminalSummaryVM): ToolRow | null {
	if (vm.loadError) return null;
	const row = { title: 'Terminal sizing', href: '/terminal', action: 'Open' };
	if (vm.empty) return { ...row, status: 'No positions planned', action: 'Plan a position' };
	const parts = [`${vm.totalValueWanted} target value`];
	if (vm.monthlyAutobuyTotal) parts.push(`${vm.monthlyAutobuyTotal} a month`);
	return { ...row, status: parts.join(' · ') };
}

export function taxRow(vm: TaxPanelVM): ToolRow {
	const title = vm.taxYear ? `Tax-loss harvesting ${vm.taxYear}` : 'Tax-loss harvesting';
	const row = { title, href: vm.href, action: 'Open tax' };
	if (vm.unavailable) return { ...row, status: 'Tax data unavailable' };
	if (vm.needsProfile) return { ...row, status: 'Tax profile needed', action: 'Set up' };
	if (vm.opportunities.length === 0) return { ...row, status: 'No open opportunities' };
	return {
		...row,
		status: `${vm.harvestableLosses} harvestable · ${vm.estimatedBenefit} est. benefit`
	};
}
