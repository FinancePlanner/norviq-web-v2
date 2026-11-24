// The DS 2.0 money contract (spec § 5.4): one currency-aware formatter, proven
// by the shared golden fixtures in __fixtures__/money.json.
//
// - The currency comes from the data, never the browser or the device. A
//   missing or malformed code renders the number plus " —" (NBSP, em dash),
//   never "$".
// - The app locale picks only separators and the symbol's position.
// - Native Intl output is normalised: narrow and thin spaces become NBSP, and
//   every hyphen-minus becomes U+2212.
//
// format.ts stays the locale-free Go port; screens move onto this one by one.
// Intl.NumberFormat construction is the expensive part, so instances are
// cached per option set (the Worker has a 10 ms CPU budget).

import type { Locale } from './i18n/index.js';

export type AppLocale = Locale;

const NBSP = ' ';
const MINUS = '−';
const MISSING_CURRENCY = NBSP + '—';

export function intlLocale(l: AppLocale): 'en-US' | 'pt-PT' {
	return l === 'pt-PT' ? 'pt-PT' : 'en-US';
}

export function normalise(s: string): string {
	return s.replace(/[  ]/g, NBSP).replace(/-/g, MINUS);
}

const cache = new Map<string, Intl.NumberFormat>();

function formatter(locale: AppLocale, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
	const key = intlLocale(locale) + JSON.stringify(opts);
	let f = cache.get(key);
	if (!f) {
		f = new Intl.NumberFormat(intlLocale(locale), opts);
		cache.set(key, f);
	}
	return f;
}

/** An ISO 4217 code, upper-cased, or null when absent or malformed (Intl would throw). */
function currencyCode(currency: string | null | undefined): string | null {
	const code = (currency ?? '').trim();
	return /^[A-Za-z]{3}$/.test(code) ? code.toUpperCase() : null;
}

type Sign = 'auto' | 'exceptZero';

function format(
	value: number,
	currency: string | null | undefined,
	locale: AppLocale,
	signDisplay: Sign,
	compact: boolean
): string {
	const code = currencyCode(currency);
	const shape: Intl.NumberFormatOptions = compact
		? { notation: 'compact', maximumFractionDigits: 2 }
		: {};
	if (code) {
		const f = formatter(locale, { style: 'currency', currency: code, signDisplay, ...shape });
		return normalise(f.format(value));
	}
	const f = formatter(locale, {
		style: 'decimal',
		signDisplay,
		...(compact ? shape : { minimumFractionDigits: 2, maximumFractionDigits: 2 })
	});
	return normalise(f.format(value)) + MISSING_CURRENCY;
}

/** "€124,580.42", "124 580,42 €", "48 432,05 US$". Negative values carry U+2212. */
export function money(
	value: number,
	currency: string | null | undefined,
	locale: AppLocale
): string {
	return format(value, currency, locale, 'auto', false);
}

/** A delta: "+€13,480.10", "−$168.78", and zero unsigned. */
export function signedMoney(
	value: number,
	currency: string | null | undefined,
	locale: AppLocale
): string {
	return format(value, currency, locale, 'exceptZero', false);
}

/** Tiles and axes only, never tables: "€1.24M", "48,43 mil US$". */
export function compactMoney(
	value: number,
	currency: string | null | undefined,
	locale: AppLocale
): string {
	return format(value, currency, locale, 'auto', true);
}

/** A fraction as a signed percent with one decimal: 0.0321 → "+3.2%", 0 → "0.0%". */
export function signedPercent(fraction: number, locale: AppLocale): string {
	const f = formatter(locale, {
		style: 'percent',
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
		signDisplay: 'exceptZero'
	});
	return normalise(f.format(fraction));
}

/** A value already in percent points, one decimal, sign only when negative: 12.5 → "12.5%". */
export function percentPoints(value: number, locale: AppLocale): string {
	const f = formatter(locale, {
		style: 'percent',
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});
	return normalise(f.format(value / 100));
}
