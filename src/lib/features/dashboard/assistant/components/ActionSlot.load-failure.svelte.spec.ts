import { describe, expect, it } from 'vitest';
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

describe('ActionSlot holdings card load failure', () => {
	it('says to reload, and offers no generic Confirm', async () => {
		render(ActionSlot, {
			action: {
				id: 'a1',
				summary: 'Save 1 holding to Main.',
				expiresAt: 'in 10 minutes',
				status: 'pending',
				holdings
			},
			onreply: () => {},
			// A stale chunk or a dropped connection makes the card's dynamic import reject.
			loadCard: () => Promise.reject(new Error('chunk failed'))
		} as never);
		await expect
			.element(page.getByText("Couldn't load this card. Reload the page to review it."))
			.toBeVisible();
		expect(page.getByRole('button', { name: 'Confirm' }).elements()).toHaveLength(0);
	});
});
