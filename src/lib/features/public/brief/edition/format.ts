// Financial formatting for the editorial brief, through Intl. Numbers follow
// the brief's own convention (the backend formatter and the model's prompt):
// pt-PT "25.029,33" and "5,61%", en "25,029.33" and "5.61%", so the cards
// agree with the narrative beside them. Signs use the true minus (U+2212):
// it lines up with "+" in tabular figures, and screen readers get the
// spoken label instead.
import type { Direction } from './types.js';

const MINUS = '−';

/** Number locale: de-DE groups with "." from 1,000 up, as the brief's pt-PT text does. */
function numberLocale(lang: string): string {
	return lang === 'pt-PT' ? 'de-DE' : 'en-US';
}

/** Date locale: "20 November 2026" / "20 de novembro de 2026". */
function dateLocale(lang: string): string {
	return lang === 'pt-PT' ? 'pt-PT' : 'en-GB';
}

/** Direction of a value as shown at `decimals`: −0.001 at two decimals is flat. */
export function directionOf(value: number, decimals = 2): Direction {
	const shown = Number(value.toFixed(decimals));
	if (shown > 0) return 'up';
	if (shown < 0) return 'down';
	return 'flat';
}

// Intl formatters are costly to build and a page formats a few hundred
// values; the Worker's CPU budget is small, so build each one once per isolate.
const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function numberFormat(lang: string, decimals: number): Intl.NumberFormat {
	const key = lang + '|' + decimals;
	let f = numberFormats.get(key);
	if (!f) {
		f = new Intl.NumberFormat(numberLocale(lang), {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		});
		numberFormats.set(key, f);
	}
	return f;
}

function dateFormat(key: string, make: () => Intl.DateTimeFormat): Intl.DateTimeFormat {
	let f = dateFormats.get(key);
	if (!f) {
		f = make();
		dateFormats.set(key, f);
	}
	return f;
}

export function formatNumber(value: number, lang: string, decimals: number): string {
	const s = numberFormat(lang, decimals).format(Math.abs(value));
	return directionOf(value, decimals) === 'down' ? MINUS + s : s;
}

/** A level at the instrument's precision (at most three decimals). */
export function formatLevel(value: number, lang: string, precision = 2): string {
	return formatNumber(value, lang, Math.min(precision, 3));
}

export function formatSigned(value: number, lang: string, decimals: number): string {
	const body = formatNumber(Math.abs(value), lang, decimals);
	const d = directionOf(value, decimals);
	if (d === 'up') return '+' + body;
	if (d === 'down') return MINUS + body;
	return body;
}

/** "+0.48%" / "−5,61 %" (pt-PT puts a space before %). */
export function formatPercent(value: number, lang: string, decimals = 2): string {
	return formatSigned(value, lang, decimals) + '%';
}

/** A yield's move: "−13.9 bp". */
export function formatBps(value: number, lang: string): string {
	return formatSigned(value, lang, 1) + ' ' + (lang === 'pt-PT' ? 'p.b.' : 'bp');
}

/** "4.910%" for a yield level. */
export function formatYield(value: number, lang: string, precision = 3): string {
	return formatNumber(value, lang, Math.min(precision, 3)) + '%';
}

/** "20 November 2026" / "20 de novembro de 2026". */
export function formatLongDate(iso: string, lang: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	if (!y || !m || !d) return iso;
	return dateFormat(
		'long|' + lang,
		() =>
			new Intl.DateTimeFormat(dateLocale(lang), {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
				timeZone: 'UTC'
			})
	).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "22:33" in a time zone. */
export function formatTime(iso: string, timeZone: string, lang: string): string {
	const t = new Date(iso);
	if (Number.isNaN(t.getTime())) return '';
	return dateFormat(
		'time|' + lang + '|' + timeZone,
		() =>
			new Intl.DateTimeFormat(dateLocale(lang), {
				hour: '2-digit',
				minute: '2-digit',
				hourCycle: 'h23',
				timeZone
			})
	).format(t);
}

/** Spoken direction word for labels. */
export function directionWord(d: Direction, lang: string): string {
	const pt = lang === 'pt-PT';
	if (d === 'up') return pt ? 'a subir' : 'up';
	if (d === 'down') return pt ? 'a descer' : 'down';
	return pt ? 'sem alteração' : 'unchanged';
}

/** Legacy rows carry "5.61%" (en) or "5,61%" (pt-PT) unsigned; read it back. */
export function parseLegacyPercent(raw: string): number | null {
	const bare = raw.replace(/[%\s\u00a0]/g, '');
	// The last separator is the decimal one: "1,234.50" (en), "1.234,50" (pt-PT).
	const decimalComma = bare.lastIndexOf(',') > bare.lastIndexOf('.');
	const normal = decimalComma ? bare.replace(/\./g, '').replace(',', '.') : bare.replace(/,/g, '');
	if (!/^\d+(\.\d+)?$/.test(normal)) return null;
	return Number(normal);
}
