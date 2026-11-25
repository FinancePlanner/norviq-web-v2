import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';

// t() and locale() read page.data.locale; vi.hoisted lets each test switch it.
const state = vi.hoisted(() => ({ page: { data: { locale: 'en' } } }));
vi.mock('$app/state', () => state);

import MoneyText from './MoneyText.svelte';
import DeltaText from './DeltaText.svelte';
import AsOf from './AsOf.svelte';
import fixtures from '../../../__fixtures__/money.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- one helper for components with different props
const html = (C: any, props: Record<string, unknown>) => render(C, { props }).body;
const text = (body: string) => body.replace(/<[^>]*>/g, '').replace(/<!---->/g, '');

beforeEach(() => {
	state.page.data.locale = 'en';
});

describe('MoneyText', () => {
	it('prints the data currency in en', () => {
		expect(html(MoneyText, { value: 124580.42, currency: 'EUR' })).toContain('€124,580.42');
	});

	it('prints pt-PT separators with U+00A0', () => {
		state.page.data.locale = 'pt-PT';
		expect(html(MoneyText, { value: 124580.42, currency: 'EUR' })).toContain('124 580,42 €');
	});

	it('renders a dash and an accessible name for NaN', () => {
		const body = html(MoneyText, { value: NaN, currency: 'EUR' });
		expect(body).toContain('—');
		expect(body).toContain('aria-label="Not available"');
		expect(body).not.toContain('NaN');
	});

	it('shows a missing currency as " —", never $', () => {
		const body = html(MoneyText, { value: 10, currency: null });
		expect(text(body)).toMatch(/\u00a0—$/);
		expect(body).not.toContain('$');
	});

	it('signed and compact variants route to the money contract', () => {
		expect(html(MoneyText, { value: -5, currency: 'USD', signed: true })).toContain('−$5.00');
		expect(html(MoneyText, { value: 1240000, currency: 'EUR', compact: true })).toContain('€1.24M');
	});

	it('matches the shared golden fixtures it covers', () => {
		const cases = fixtures.cases.filter((c) => c.kind === 'money' && c.style === 'standard');
		expect(cases.length).toBeGreaterThan(0);
		for (const c of cases) {
			state.page.data.locale = c.locale === 'pt-PT' ? 'pt-PT' : 'en';
			const body = html(MoneyText, { value: c.value, currency: c.currency });
			expect(body).toContain(c.expected);
		}
	});
});

describe('DeltaText', () => {
	it('shows direction by arrow and sign, with a basis and sr text', () => {
		const body = html(DeltaText, { fraction: -0.032, basis: '1 month' });
		expect(body).toContain('is-negative');
		expect(body).toContain('▼');
		expect(body).toContain('−3.2%');
		expect(body).toContain('1 month');
		expect(body).toContain('down');
	});

	it('is positive with an up sr text', () => {
		const body = html(DeltaText, { fraction: 0.0321 });
		expect(body).toContain('is-positive');
		expect(body).toContain('▲');
		expect(body).toContain('up +3.2%');
	});

	it('appends a signed amount', () => {
		const body = html(DeltaText, {
			fraction: 0.05,
			amount: { value: 13480.1, currency: 'EUR' }
		});
		expect(body).toContain('+€13,480.10');
	});

	it('drops a non-finite amount and keeps the percent', () => {
		const body = html(DeltaText, {
			fraction: -0.032,
			amount: { value: NaN, currency: 'EUR' }
		});
		expect(body).not.toContain('NaN');
		expect(body).toContain('−3.2%');
	});

	it('prints an amount without currency as NBSP + dash, never $', () => {
		const body = html(DeltaText, {
			fraction: -0.032,
			amount: { value: -1250.5, currency: null }
		});
		expect(body).toContain('−1,250.50\u00a0—');
		expect(body).not.toContain('$');
	});

	it('puts the amount in the screen-reader text', () => {
		const body = html(DeltaText, {
			fraction: -0.032,
			basis: '1 month',
			amount: { value: -1250.5, currency: 'EUR' }
		});
		const sr = /<span class="sr-only">([^<]*)<\/span>/.exec(body)?.[1];
		expect(sr).toBe('down −3.2%, −€1,250.50 1 month');
	});

	it('is flat at zero and when it rounds to 0.0%', () => {
		for (const fraction of [0, 0.00004]) {
			const body = html(DeltaText, { fraction });
			expect(body).toContain('is-flat');
			expect(body).toContain('unchanged');
			expect(body).not.toContain('is-positive');
		}
	});

	it('renders nothing for a null fraction', () => {
		expect(text(html(DeltaText, { fraction: null })).trim()).toBe('');
		expect(html(DeltaText, { fraction: null })).not.toContain('vigil-delta');
	});
});

describe('AsOf', () => {
	it('states a fresh date plainly', () => {
		const body = html(AsOf, { date: '2026-11-24', now: new Date('2026-11-25') });
		expect(body).toContain('As of 24 Nov 2026');
		expect(body).not.toContain('is-stale');
	});

	it('flags a stale date', () => {
		const body = html(AsOf, { date: '2026-11-18', now: new Date('2026-11-25') });
		expect(body).toContain('is-stale');
		expect(body).toContain('Prices as of');
	});
});
