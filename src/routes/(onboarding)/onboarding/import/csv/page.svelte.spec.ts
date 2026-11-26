import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import '../../../../layout.css';
import Page from './+page.svelte';

const LIST = '3f1c2a4e-5b6d-4e7f-8a9b-0c1d2e3f4a5b';
const row = (line: number, symbol: string, replacesExisting: boolean) => ({
	line,
	symbol,
	shares: '1',
	buyPrice: '',
	buyDate: '',
	replacesExisting
});

describe('csv import page', () => {
	it('notes which preview rows replace an existing holding', async () => {
		const data = { step: 2, providers: ['generic'], provider: 'generic', portfolioListId: LIST };
		const form = {
			preview: {
				provider: 'generic',
				rows: [row(2, 'AAPL', true), row(3, 'MSFT', false)],
				errors: [],
				error: '',
				committed: false,
				inserted: 0,
				updated: 0
			}
		};
		render(Page, { data, form } as never);
		await expect.element(page.getByText('Replaces your existing AAPL')).toBeVisible();
		expect(page.getByText('Replaces your existing MSFT').elements()).toHaveLength(0);
	});

	it('carries the portfolio id through the form posts', async () => {
		const data = { step: 2, providers: ['generic'], provider: 'generic', portfolioListId: LIST };
		render(Page, { data, form: null } as never);
		const input = document.querySelector('#csv-form input[name="portfolio_list_id"]');
		expect((input as HTMLInputElement).value).toBe(LIST);
	});
});
