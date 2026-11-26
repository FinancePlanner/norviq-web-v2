import { beforeEach, expect, test, vi } from 'vitest';

const apiJSON = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock('#lib/server/api.js', () => ({ apiJSON: (...a: unknown[]) => apiJSON(...a) }));

const { load } = await import('./+page.server.js');

const run = (qs = '') =>
	load({ url: new URL('http://x/portfolio/import' + qs) } as Parameters<typeof load>[0]);

const items = [
	{ id: 'p1', name: 'Main', mode: 'actual' },
	{ id: 'p2', name: 'Retire', mode: 'actual', isDefault: true }
];

beforeEach(() => apiJSON.mockReset());

test('lists the portfolios and defaults to the default one', async () => {
	apiJSON.mockResolvedValue({ items });
	const data = (await run()) as { portfolios: unknown[]; selectedId: string };
	expect(apiJSON.mock.calls[0].slice(1)).toEqual(['GET', '/v1/portfolios']);
	expect(data.portfolios).toHaveLength(2);
	expect(data.selectedId).toBe('p2');
});

test('prefers portfolio_list_id from the url', async () => {
	apiJSON.mockResolvedValue({ items });
	expect(((await run('?portfolio_list_id=p1')) as { selectedId: string }).selectedId).toBe('p1');
});

test('falls back to the first list, and to none when the load fails', async () => {
	apiJSON.mockResolvedValueOnce({ items: [items[0]] });
	expect(((await run('?portfolio_list_id=zzz')) as { selectedId: string }).selectedId).toBe('p1');
	apiJSON.mockRejectedValueOnce(new Error('boom'));
	const data = (await run()) as { portfolios: unknown[]; selectedId: string };
	expect(data.portfolios).toEqual([]);
	expect(data.selectedId).toBe('');
});

const UP = '3F1C2A4E-5B6D-4E7F-8A9B-0C1D2E3F4A5B';

test('matches the id case-insensitively against upper-case list ids', async () => {
	apiJSON.mockResolvedValue({
		items: [
			{ id: 'AAAAAAAA-5B6D-4E7F-8A9B-0C1D2E3F4A5B', name: 'Main', mode: 'actual', isDefault: true },
			{ id: UP, name: 'Retire', mode: 'actual' }
		]
	});
	const data = (await run('?portfolio_list_id=' + UP.toLowerCase())) as { selectedId: string };
	expect(data.selectedId).toBe(UP);
});

test('keeps a valid UUID when the list fetch fails', async () => {
	apiJSON.mockRejectedValueOnce(new Error('boom'));
	expect(((await run('?portfolio_list_id=' + UP)) as { selectedId: string }).selectedId).toBe(UP);
	apiJSON.mockRejectedValueOnce(new Error('boom'));
	expect(((await run('?portfolio_list_id=zzz')) as { selectedId: string }).selectedId).toBe('');
});
