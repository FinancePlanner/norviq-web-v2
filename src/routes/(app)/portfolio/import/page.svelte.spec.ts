import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import '../../../layout.css';
import Page from './+page.svelte';

const data = {
	portfolios: [
		{ id: 'p1', name: 'Main', mode: 'actual' },
		{ id: 'p2', name: 'Retire', mode: 'actual' }
	],
	selectedId: 'p2'
};

describe('/portfolio/import', () => {
	it('shows the IBKR screenshot guide and method links for the chosen list', async () => {
		render(Page, { data } as never);
		await page.getByRole('button', { name: 'IBKR' }).click();
		await expect
			.element(
				page.getByText(
					'Open your positions list in the IBKR app or website and take screenshots that show every holding. You can import up to 3 at a time.'
				)
			)
			.toBeVisible();
		await expect
			.element(page.getByRole('link', { name: 'Screenshots' }))
			.toHaveAttribute('href', '/portfolio/import/screenshot?portfolio_list_id=p2');
		await expect
			.element(page.getByRole('link', { name: 'Ask Q' }))
			.toHaveAttribute('href', '/assistant');
		expect(page.getByRole('link', { name: 'CSV file' }).elements()).toHaveLength(0);
	});

	it('shows the CSV hint and csv link first for other brokers', async () => {
		render(Page, { data } as never);
		await page.getByRole('button', { name: 'Other broker (CSV)' }).click();
		await expect.element(page.getByText('symbol,shares,buy_price,buy_date,notes')).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: 'CSV file' }))
			.toHaveAttribute('href', '/onboarding/import/csv?portfolio_list_id=p2');
	});

	it('marks the chosen broker with the DS2 active chip and aria-pressed', async () => {
		render(Page, { data } as never);
		await page.getByRole('button', { name: 'IBKR' }).click();
		const ibkr = page.getByRole('button', { name: 'IBKR' });
		await expect.element(ibkr).toHaveAttribute('aria-pressed', 'true');
		await expect.element(ibkr).toHaveClass('filter-chip-active');
		await expect
			.element(page.getByRole('button', { name: 'DEGIRO' }))
			.not.toHaveClass('filter-chip-active');
	});

	it('shows the generic screenshot guide for other brokers', async () => {
		render(Page, { data } as never);
		await page.getByRole('button', { name: 'Other broker (CSV)' }).click();
		await page.getByRole('button', { name: 'Screenshots' }).click();
		await expect.element(page.getByText("in your broker's app or website")).toBeVisible();
	});

	it('shows the Ask Q guide', async () => {
		render(Page, { data } as never);
		await page.getByRole('button', { name: 'IBKR' }).click();
		await page.getByRole('button', { name: 'Ask Q' }).click();
		await expect
			.element(
				page.getByText(
					'Attach your screenshots to Q and ask it to update your holdings. You review every row before anything is saved.'
				)
			)
			.toBeVisible();
	});
});
