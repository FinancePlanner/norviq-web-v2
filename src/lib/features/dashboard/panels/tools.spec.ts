import { describe, expect, it } from 'vitest';
import { mcpRow, taxRow, terminalRow } from './tools.js';
import type { MCPStatusVM, TaxPanelVM, TerminalSummaryVM } from './types.js';

const mcp = (o: Partial<MCPStatusVM>): MCPStatusVM => ({
	isPro: true,
	hasTokens: true,
	tokenCount: 2,
	liveCount: 0,
	lastActivity: '',
	agenticLabel: '',
	scopes: [],
	agents: [],
	loadError: false,
	needsPro: false,
	empty: false,
	...o
});

describe('tools rows', () => {
	it('summarises MCP state in one line', () => {
		expect(mcpRow(mcp({})).status).toBe('2 tokens ready');
		expect(mcpRow(mcp({ liveCount: 1, lastActivity: '2h ago' })).status).toBe(
			'1 live · last used 2h ago'
		);
		expect(mcpRow(mcp({ needsPro: true })).href).toBe('/settings/subscription');
		expect(mcpRow(mcp({ empty: true })).status).toBe('No tokens yet');
	});

	it('drops the terminal row when its summary failed', () => {
		const base: TerminalSummaryVM = {
			loadError: true,
			empty: false,
			totalValueWanted: '$10,000',
			monthlyAutobuyTotal: '$200',
			top: [],
			disclaimer: ''
		};
		expect(terminalRow(base)).toBeNull();
		expect(terminalRow({ ...base, loadError: false })?.status).toBe(
			'$10,000 target value · $200 a month'
		);
	});

	it('names the tax figures and the empty cases', () => {
		const base: TaxPanelVM = {
			taxYear: '2026',
			harvestableLosses: '$500',
			estimatedBenefit: '$120',
			opportunities: [{ symbol: 'X', benefit: '$120', unrealizedLoss: '-$500' }],
			href: '/tax',
			needsProfile: false,
			isStale: false,
			unavailable: false
		};
		expect(taxRow(base)).toMatchObject({
			title: 'Tax-loss harvesting 2026',
			status: '$500 harvestable · $120 est. benefit'
		});
		expect(taxRow({ ...base, opportunities: [] }).status).toBe('No open opportunities');
		expect(taxRow({ ...base, needsProfile: true }).action).toBe('Set up');
	});
});
