import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import '../../../../../routes/layout.css';
import HoldingsCard from './HoldingsCard.svelte';
import { parseHoldingsAction } from '../holdings.js';

// The pending action the backend stores (proposedHoldings): AAPL is new, MSFT is held by hand.
const holdings = parseHoldingsAction({
	toolName: 'update_holdings',
	arguments:
		'{"portfolioListId":"L1","fromCsv":false,"rows":[' +
		'{"symbol":"AAPL","shares":10,"avgPrice":150,"buyDate":null,"existing":"none","willReplaceImport":false,"needsCost":false},' +
		'{"symbol":"MSFT","shares":5,"avgPrice":300,"buyDate":"2024-03-10","existing":"manual","willReplaceImport":false,"needsCost":false}]}'
})!;

function props(over: Record<string, unknown> = {}) {
	return {
		actionID: 'a1',
		summary: 'Save 2 holdings to Main.',
		expiresAt: 'in 10 minutes',
		holdings,
		lists: [
			{ id: 'L1', name: 'Main' },
			{ id: 'L2', name: 'Retire' }
		],
		busy: false,
		error: null,
		onsave: vi.fn<(body: unknown) => void>(),
		oncancel: vi.fn<() => void>(),
		...over
	};
}

describe('HoldingsCard', () => {
	it('lists each row with its symbol, shares and average cost', async () => {
		render(HoldingsCard, props() as never);
		await expect.element(page.getByText('Review holdings')).toBeVisible();
		const symbols = page.getByRole('textbox', { name: 'Symbol' });
		await expect.element(symbols.nth(0)).toHaveValue('AAPL');
		await expect.element(symbols.nth(1)).toHaveValue('MSFT');
		await expect.element(page.getByRole('textbox', { name: 'Shares' }).nth(0)).toHaveValue('10');
		await expect
			.element(page.getByRole('textbox', { name: 'Average cost' }).nth(1))
			.toHaveValue('300');
		await expect.element(page.getByText('New')).toBeVisible();
		await expect.element(page.getByText('Replaces existing')).toBeVisible();
	});

	it('saves only the ticked rows, with the replace switch and chosen portfolio', async () => {
		const p = props();
		render(HoldingsCard, p as never);
		await page.getByRole('checkbox', { name: 'Save AAPL' }).click();
		await page
			.getByRole('checkbox', { name: /Replace positions you already hold in MSFT/ })
			.click();
		await page.getByRole('combobox', { name: 'Portfolio' }).selectOptions('L2');
		await page.getByRole('button', { name: 'Save 1 holding' }).click();
		expect(p.onsave).toHaveBeenCalledWith({
			portfolioListId: 'L2',
			replaceExisting: true,
			rows: [{ symbol: 'MSFT', shares: 5, avgPrice: 300, buyDate: '2024-03-10' }]
		});
	});

	it('blocks saving while a ticked row is incomplete and says why', async () => {
		render(HoldingsCard, props() as never);
		await page.getByRole('textbox', { name: 'Average cost' }).nth(0).fill('');
		await expect.element(page.getByText('Enter the average price.')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Save 2 holdings' })).toBeDisabled();
	});

	it('shows the backend reason, the colliding symbols and the rows it names', async () => {
		render(
			HoldingsCard,
			props({
				error: {
					message: 'These holdings already exist: AAPL. Turn on “Replace existing” to update them.',
					rowErrors: [{ index: 1, code: '', message: 'No such symbol.' }],
					collisionSymbols: ['AAPL']
				}
			}) as never
		);
		await expect.element(page.getByText(/These holdings already exist: AAPL/)).toBeVisible();
		await expect.element(page.getByText('No such symbol.')).toBeVisible();
		await expect
			.element(page.getByRole('checkbox', { name: /Replace positions you already hold in AAPL/ }))
			.toBeVisible();
	});

	it('offers the fixed label when a collision names no symbols', async () => {
		const noHeld = parseHoldingsAction({
			toolName: 'update_holdings',
			arguments:
				'{"portfolioListId":"L1","fromCsv":true,"rows":[{"symbol":"AAPL","shares":1,"avgPrice":1,"existing":"none"}]}'
		})!;
		const p = props({ holdings: noHeld });
		render(HoldingsCard, p as never);
		expect(page.getByRole('checkbox', { name: /Replace/ }).elements()).toHaveLength(0);
		await expect
			.element(page.getByText('Check each row against your CSV. Only ticked rows are saved.'))
			.toBeVisible();
	});

	it('cancels', async () => {
		const p = props();
		render(HoldingsCard, p as never);
		await page.getByRole('button', { name: 'Cancel' }).click();
		expect(p.oncancel).toHaveBeenCalled();
	});
});
