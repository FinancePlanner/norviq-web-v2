import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import '../../../../layout.css';
import Page from './+page.svelte';

const LIST = '3f1c2a4e-5b6d-4e7f-8a9b-0c1d2e3f4a5b';
const row = (line: number, symbol: string, replacesExisting: boolean, foreignHolding = false) => ({
	line,
	symbol,
	shares: '1',
	buyPrice: '',
	buyDate: '',
	replacesExisting,
	foreignHolding
});

describe('csv import page', () => {
	it('notes which preview rows replace an existing holding', async () => {
		const data = { step: 2, providers: ['generic'], provider: 'generic', portfolioListId: LIST };
		const form = {
			preview: {
				provider: 'generic',
				rows: [row(2, 'AAPL', true), row(3, 'MSFT', false)],
				needsMergeConfirm: false,
				portfolioListId: '',
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

	it('carries the portfolio id through the form posts', () => {
		const data = { step: 2, providers: ['generic'], provider: 'generic', portfolioListId: LIST };
		render(Page, { data, form: null } as never);
		const input = document.querySelector('#csv-form input[name="portfolio_list_id"]');
		expect((input as HTMLInputElement).value).toBe(LIST);
	});

	it('offers the replace toggle only for a holding the import does not own', async () => {
		const data = { step: 2, providers: ['generic'], provider: 'generic', portfolioListId: '' };
		const preview = (rows: ReturnType<typeof row>[], needsMergeConfirm = false) => ({
			preview: {
				provider: 'generic',
				portfolioListId: '',
				rows,
				errors: [],
				error: '',
				committed: false,
				inserted: 0,
				updated: 0,
				needsMergeConfirm
			}
		});
		const own = render(Page, { data, form: preview([row(2, 'AAPL', true)]) } as never);
		expect(document.querySelector('input[name="confirm_merge_existing"]')).toBeNull();
		await own.unmount();
		render(Page, { data, form: preview([row(3, 'MSFT', true, true)], true) } as never);
		const box = document.querySelector('input[name="confirm_merge_existing"]') as HTMLInputElement;
		expect(box.getAttribute('form')).toBe('csv-form');
		expect(box.checked).toBe(true);
		await expect.element(page.getByText(/Replace positions you already hold in/)).toBeVisible();
	});

	it('keeps the toggle after a mixed 409 re-preview, when no row is flagged foreign', async () => {
		const data = { step: 2, providers: ['generic'], provider: 'generic', portfolioListId: '' };
		render(Page, {
			data,
			form: {
				preview: {
					provider: 'generic',
					portfolioListId: '',
					rows: [row(2, 'MSFT', true)],
					errors: [],
					error: 'Some holdings were not created by this import.',
					committed: false,
					inserted: 0,
					updated: 0,
					needsMergeConfirm: true
				}
			}
		} as never);
		const box = document.querySelector('input[name="confirm_merge_existing"]') as HTMLInputElement;
		expect(box.checked).toBe(true);
		await expect.element(page.getByText(/hold in\s+MSFT\. Without this/)).toBeVisible();
	});
});
