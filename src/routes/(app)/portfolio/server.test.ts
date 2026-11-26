import { beforeEach, expect, test, vi } from 'vitest';

const loadHoldingsViewModel = vi.fn<(...args: unknown[]) => Promise<Record<string, unknown>>>();
vi.mock('#lib/features/portfolio/holdings/holdings.server.js', () => ({
	loadHoldingsViewModel: (...a: unknown[]) => loadHoldingsViewModel(...a),
	loadPortfolioOptions: vi.fn<() => unknown>(async () => [
		{ id: 'p1', name: 'Main' },
		{ id: 'p2', name: 'Retire' }
	])
}));
vi.mock('#lib/features/portfolio/workspace/pilots.server.js', () => ({
	pilotFollowingByPortfolio: vi.fn<() => unknown>(async () => ({}))
}));
vi.mock('#lib/server/app-context.js', () => ({
	loadBillingContext: vi.fn<() => unknown>(async () => ({}))
}));

const { load } = await import('./+page.server.js');

beforeEach(() => {
	loadHoldingsViewModel.mockReset();
	loadHoldingsViewModel.mockResolvedValue({ addPosition: {} });
});

test('?portfolio=<id> selects that list (the param import redirects emit)', async () => {
	const res = (await load({
		url: new URL('http://x/portfolio?portfolio=p2')
	} as Parameters<typeof load>[0])) as { vm: { selectedPortfolio: string } };
	expect(loadHoldingsViewModel.mock.calls[0][2]).toBe('p2');
	expect(res.vm.selectedPortfolio).toBe('p2');
});
