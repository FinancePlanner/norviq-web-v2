import { beforeEach, expect, test, vi } from 'vitest';

const processCSVUpload = vi.fn<(...args: unknown[]) => unknown>();
vi.mock('#lib/features/auth-onboarding/onboarding/import.server.js', () => ({
	loadCSVProviders: vi.fn<() => unknown>(),
	processCSVUpload: (...a: unknown[]) => processCSVUpload(...a)
}));

const { actions } = await import('./+page.server.js');
const LIST = '3f1c2a4e-5b6d-4e7f-8a9b-0c1d2e3f4a5b';
const ev = { locals: { session: { get: () => true } } } as never;
const vm = (o: object) => ({
	portfolioListId: LIST,
	error: '',
	inserted: 2,
	updated: 0,
	errors: [],
	...o
});

beforeEach(() => processCSVUpload.mockReset());

test('a clean CSV commit redirects to the chosen portfolio via ?portfolio=', async () => {
	processCSVUpload.mockResolvedValue(vm({}));
	await expect(actions.commit(ev)).rejects.toMatchObject({
		status: 303,
		location: '/portfolio?portfolio=' + LIST
	});
});

test('row errors keep the CSV page', async () => {
	processCSVUpload.mockResolvedValue(vm({ errors: ['Line 1: bad'] }));
	expect(await actions.commit(ev)).toHaveProperty('preview');
});
