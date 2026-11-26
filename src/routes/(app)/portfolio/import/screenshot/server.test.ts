import { beforeEach, expect, test, vi } from 'vitest';

const processScreenshotCommit = vi.fn<(...args: unknown[]) => unknown>();
vi.mock('#lib/server/guards.js', () => ({ requireFeature: vi.fn<() => unknown>() }));
vi.mock('#lib/features/portfolio/ai-consent.server.js', () => ({
	aiConsentGranted: vi.fn<() => unknown>(),
	aiConsentReturnPath: vi.fn<() => unknown>()
}));
vi.mock('#lib/features/portfolio/workspace/screenshot.server.js', () => ({
	processScreenshotCommit: (...a: unknown[]) => processScreenshotCommit(...a),
	processScreenshotPreview: vi.fn<() => unknown>(),
	screenshotVMFrom: vi.fn<() => unknown>()
}));

const { actions } = await import('./+page.server.js');
const LIST = '3f1c2a4e-5b6d-4e7f-8a9b-0c1d2e3f4a5b';
const vm = (o: object) => ({
	portfolioListID: LIST,
	committed: true,
	inserted: 2,
	updated: 0,
	errors: [],
	...o
});
const run = () => actions.commit({} as never) as Promise<unknown>;

beforeEach(() => processScreenshotCommit.mockReset());

test('a clean commit redirects to the chosen portfolio', async () => {
	processScreenshotCommit.mockResolvedValue(vm({}));
	await expect(run()).rejects.toMatchObject({
		status: 303,
		location: '/portfolio?portfolio_list_id=' + LIST
	});
});

test('without a valid id it lands on /portfolio', async () => {
	processScreenshotCommit.mockResolvedValue(vm({ portfolioListID: 'x' }));
	await expect(run()).rejects.toMatchObject({ status: 303, location: '/portfolio' });
});

test('failures and row errors stay on the page', async () => {
	processScreenshotCommit.mockResolvedValue(vm({ committed: false }));
	expect(await run()).toHaveProperty('screenshot');
	processScreenshotCommit.mockResolvedValue(vm({ errors: ['Line 1: bad'] }));
	expect(await run()).toHaveProperty('screenshot');
});
