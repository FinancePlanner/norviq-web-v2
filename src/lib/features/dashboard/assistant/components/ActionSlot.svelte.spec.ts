import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import '../../../../../routes/layout.css';
import ActionSlot from './ActionSlot.svelte';
import { parseHoldingsAction } from '../holdings.js';

const holdings = parseHoldingsAction({
	toolName: 'update_holdings',
	arguments:
		'{"portfolioListId":"L1","fromCsv":false,"rows":[{"symbol":"AAPL","shares":1,"avgPrice":2,"existing":"none"}]}'
})!;
const action = {
	id: 'a1',
	summary: 'Save 1 holding to Main.',
	expiresAt: 'in 10 minutes',
	status: 'pending',
	holdings
};

afterEach(() => vi.unstubAllGlobals());

describe('ActionSlot holdings card', () => {
	it('a failed Cancel says "That did not go through", not the save fallback', async () => {
		vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 400 })));
		render(ActionSlot, { action, onreply: () => {} } as never);
		await page.getByRole('button', { name: 'Cancel' }).click();
		await expect.element(page.getByText('That did not go through. Try again.')).toBeVisible();
		expect(page.getByText("Couldn't save these holdings.").elements()).toHaveLength(0);
	});

	it('a failed save with a 4xx shows the holdings fallback', async () => {
		vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 400 })));
		render(ActionSlot, { action, onreply: () => {} } as never);
		await page.getByRole('button', { name: 'Save 1 holding' }).click();
		await expect.element(page.getByText("Couldn't save these holdings. Try again.")).toBeVisible();
	});
});
