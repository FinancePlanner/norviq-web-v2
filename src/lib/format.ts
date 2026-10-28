// Port of norviq-web internal/format: renders numbers for Norviq pages and
// parses the amounts people type back into numbers.
//
// The Go web's number output is locale-independent (always "1,234.56", never
// "1.234,56", even in pt-PT), so this module does not use Intl number
// formatting: Intl would localise separators and round ties differently.
// Instead `formatFloat` reproduces Go's strconv.FormatFloat / fmt "%.Nf"
// exactly (exact decimal expansion, ties to even), and everything else is
// built on it. Pure TS: runs on Workers and in the browser.
//
// The second half of the file ports the generic helpers that were scattered
// across internal/handlers (formatCurrency, formatWithCommas, ...). They keep
// their Go names so a feature port can map them one to one.

/** Stands in for a value that does not exist: no price yet, or a scenario the backend could not compute. */
export const DASH = '—';

// ---------------------------------------------------------------------------
// Go float formatting primitives

/** Go's math.Round: half away from zero (JS Math.round rounds -2.5 to -2). */
export function goRound(v: number): number {
	if (!Number.isFinite(v)) return v;
	const r = Math.round(Math.abs(v));
	return v < 0 ? -r : r;
}

function finite(v: number): boolean {
	return Number.isFinite(v);
}

function isNegative(v: number): boolean {
	return v < 0 || Object.is(v, -0);
}

/** Expand a toExponential() string ("1.25e+21") into plain decimal digits. */
function plainFromExponential(exp: string): string {
	const [mant, e] = exp.split('e');
	const power = Number(e);
	const [intDigits, fracDigits = ''] = mant.split('.');
	const digits = intDigits + fracDigits;
	const point = intDigits.length + power;
	if (point <= 0) return '0.' + '0'.repeat(-point) + digits;
	if (point >= digits.length) return digits + '0'.repeat(point - digits.length);
	return digits.slice(0, point) + '.' + digits.slice(point);
}

function fixedAbs(abs: number, prec: number): string {
	if (abs >= 1e21) {
		// toFixed switches to exponent notation here; the value is an integer.
		const whole = BigInt(abs).toString();
		return prec > 0 ? whole + '.' + '0'.repeat(prec) : whole;
	}
	if (prec > 75) return abs.toFixed(Math.min(prec, 100));
	const rounded = abs.toFixed(prec);
	// toFixed breaks exact ties upwards; Go breaks them to even. A tie means the
	// exact expansion stops at digit prec+1 with a 5, which toFixed(prec+25)
	// shows exactly (a double's distance from a tie is far above 1e-25 relative).
	const longer = abs.toFixed(prec + 25);
	const tieTail = '5' + '0'.repeat(24);
	if (!longer.endsWith(tieTail)) return rounded;
	const truncated = longer.slice(0, longer.length - 25).replace(/\.$/, '');
	const lastDigit = Number(truncated.replace('.', '').slice(-1));
	return lastDigit % 2 === 0 ? truncated : rounded;
}

/**
 * Go's strconv.FormatFloat(v, 'f', prec, 64) — also what fmt's "%.Nf" prints.
 * prec -1 is the shortest representation that round-trips, never in exponent form.
 */
export function formatFloat(v: number, prec: number): string {
	if (Number.isNaN(v)) return 'NaN';
	if (v === Infinity) return '+Inf';
	if (v === -Infinity) return '-Inf';
	const sign = isNegative(v) ? '-' : '';
	const abs = Math.abs(v);
	if (prec < 0) return sign + plainFromExponential(abs.toExponential());
	return sign + fixedAbs(abs, prec);
}

/** fmt.Sprintf("%.Nf", v). */
export const sprintfFixed = formatFloat;

// ---------------------------------------------------------------------------
// internal/format

const currencySymbols: Record<string, string> = {
	USD: '$',
	EUR: '€',
	GBP: '£',
	JPY: '¥',
	BRL: 'R$',
	CAD: 'CA$',
	AUD: 'A$',
	CHF: 'CHF '
};

// Largest first: compact takes the first unit the value reaches.
const compactUnits: Array<{ size: number; suffix: string }> = [
	{ size: 1e12, suffix: 'T' },
	{ size: 1e9, suffix: 'B' },
	{ size: 1e6, suffix: 'M' },
	{ size: 1e3, suffix: 'K' }
];

function round2(v: number): number {
	return goRound(v * 100) / 100;
}

function trim(v: number): string {
	return formatFloat(v, -1);
}

/**
 * Maps an ISO 4217 code to the symbol shown before an amount. An unknown code
 * is shown as the code and a space ("SEK "); an empty code shows no symbol.
 */
export function currencySymbol(code: string): string {
	const c = code.trim().toUpperCase();
	if (c === '') return '';
	return currencySymbols[c] ?? c + ' ';
}

/**
 * Renders 10000000000000 as "10T" and 1250000000 as "1.25B": at most two
 * decimals, no trailing zeros. A value that rounds up to 1000 of a unit moves
 * to the next unit, so 999999 is "1M" rather than "1000K".
 */
export function compact(v: number): string {
	if (!finite(v)) return DASH;
	let sign = '';
	if (v < 0) {
		sign = '-';
		v = -v;
	}
	for (let i = 0; i < compactUnits.length; i++) {
		const unit = compactUnits[i];
		if (v < unit.size) continue;
		const scaled = round2(v / unit.size);
		if (scaled < 1000 || i === 0) return sign + trim(scaled) + unit.suffix;
		const bigger = compactUnits[i - 1];
		return sign + trim(round2(v / bigger.size)) + bigger.suffix;
	}
	const r = round2(v);
	if (r === 0) return '0';
	if (r >= 1000) return sign + '1K';
	return sign + trim(r);
}

/** compact with the currency symbol: "$10T", "-€1.5K". */
export function compactCurrency(v: number, code: string): string {
	if (!finite(v)) return DASH;
	const c = compact(Math.abs(v));
	if (v < 0 && c !== '0') return '-' + currencySymbol(code) + c;
	return currencySymbol(code) + c;
}

/** Inserts thousands separators into a run of digits. */
function group(digits: string): string {
	if (digits.length <= 3) return digits;
	const lead = digits.length % 3;
	const parts: string[] = [];
	if (lead > 0) parts.push(digits.slice(0, lead));
	for (let i = lead; i < digits.length; i += 3) parts.push(digits.slice(i, i + 3));
	return parts.join(',');
}

/**
 * Renders v with thousands separators and up to maxDecimals decimals, trailing
 * zeros dropped: 1100 → "1,100", 909.0909 → "909.09".
 */
export function number(v: number, maxDecimals: number): string {
	if (!finite(v)) return DASH;
	const s = formatFloat(Math.abs(v), maxDecimals);
	const [whole, fracRaw = ''] = s.split('.');
	const frac = fracRaw.replace(/0+$/, '');
	let out = group(whole);
	if (frac !== '') out += '.' + frac;
	if (v < 0 && out.replace(/^[0.,]+|[0.,]+$/g, '') !== '') out = '-' + out;
	return out;
}

/**
 * Renders a money amount: exactly two decimals, or none when they are both
 * zero. "$909.09", "$204,050", "$185.50".
 */
export function currency(v: number, code: string): string {
	if (!finite(v)) return DASH;
	const s = formatFloat(Math.abs(v), 2);
	const [whole, frac] = s.split('.');
	let out = currencySymbol(code) + group(whole);
	if (frac !== '00') out += '.' + frac;
	if (v < 0 && s !== '0.00') out = '-' + out;
	return out;
}

/** Renders a ratio (0.6818) as "68.18%". Values above 1 stay above 100%. */
export function percent(ratio: number): string {
	if (!finite(ratio)) return DASH;
	return number(ratio * 100, 2) + '%';
}

/** Display-only "round down to whole shares": floor, never below zero. Mirrors TerminalMath.wholeShares. */
export function wholeShares(shares: number): number {
	if (!finite(shares) || shares <= 0) return 0;
	return Math.floor(shares);
}

/** The full number an input should hold and submit: no separators, no exponent. 1e13 → "10000000000000". */
export function inputNumber(v: number): string {
	if (!finite(v)) return '';
	return formatFloat(v, -1);
}

/** Returned by parseAmount for a blank input. */
export const ErrEmpty = new Error('format: empty amount');
/** Returned by parseAmount for anything that is not a finite number. */
export const ErrNotNumber = new Error('format: not a number');

export type ParseAmountResult = { ok: true; value: number } | { ok: false; error: Error };

// Go's strings.NewReplacer list. The two " " entries in the Go source are both
// plain spaces (U+0020), so a no-break space is not stripped.
const amountNoise = /[$€£¥ _]/g;
const amountSuffixes: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

// strconv.ParseFloat's accepted syntax (decimal, hex with p exponent, inf/nan).
const goDecimal = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const goHex = /^([+-]?)0[xX]((?:[0-9a-fA-F]+\.?[0-9a-fA-F]*)|(?:\.[0-9a-fA-F]+))[pP]([+-]?\d+)$/;
const goSpecial = /^[+-]?(?:inf|infinity|nan)$/i;

function goParseFloat(s: string): number | null {
	if (goDecimal.test(s)) return Number(s);
	const hex = goHex.exec(s);
	if (hex) {
		const [intPart, fracPart = ''] = hex[2].split('.');
		let mant = 0;
		for (const ch of intPart + fracPart) mant = mant * 16 + parseInt(ch, 16);
		const v = mant * Math.pow(2, Number(hex[3]) - 4 * fracPart.length);
		return hex[1] === '-' ? -v : v;
	}
	if (goSpecial.test(s)) return s.toLowerCase().includes('nan') ? NaN : s.startsWith('-') ? -Infinity : Infinity;
	return null;
}

/** Whether s is digits grouped by sep in threes: "1,234,567". */
function isGrouped(s: string, sep: string): boolean {
	const parts = s.replace(/^-/, '').split(sep);
	if (parts.length < 2 || parts[0] === '' || parts[0][0] === '0' || parts[0].length > 3) return false;
	return parts.slice(1).every((p) => p.length === 3);
}

function count(s: string, ch: string): number {
	return s.split(ch).length - 1;
}

function normalizeSeparators(s: string): string {
	const comma = s.lastIndexOf(',');
	const dot = s.lastIndexOf('.');
	if (comma >= 0 && dot >= 0 && comma > dot) return s.replaceAll('.', '').replace(',', '.'); // 1.234,56
	if (comma >= 0 && dot >= 0) return s.replaceAll(',', ''); // 1,234.56
	if (comma >= 0 && isGrouped(s, ',')) return s.replaceAll(',', ''); // 1,100
	if (comma >= 0 && count(s, ',') === 1) return s.replace(',', '.'); // 1,25
	if (dot >= 0 && count(s, '.') > 1 && isGrouped(s, '.')) return s.replaceAll('.', ''); // 1.234.567
	return s;
}

/**
 * Reads what a person typed into an amount cell: currency symbols and spaces
 * are ignored, a trailing K/M/B/T scales the number, and both "1,234.56" and
 * "1.234,56" are understood. A lone comma followed by exactly three digits
 * ("1,100") is a thousands separator; any other lone comma ("1,25") is a
 * decimal comma. A lone dot is always a decimal point, so "1.100" is 1.1.
 *
 * Go returns (value, error); here the error is ErrEmpty or ErrNotNumber
 * (compare by identity, like errors.Is).
 */
export function parseAmount(raw: string): ParseAmountResult {
	const trimmed = raw.trim();
	let s = trimmed.replace(amountNoise, '');
	if (s === '') return { ok: false, error: trimmed === '' ? ErrEmpty : ErrNotNumber };
	let multiplier = 1;
	const scale = amountSuffixes[s.slice(-1).toUpperCase()];
	if (scale !== undefined) {
		multiplier = scale;
		s = s.slice(0, -1);
	}
	const v = goParseFloat(normalizeSeparators(s));
	if (v === null || !finite(v) || !finite(v * multiplier)) return { ok: false, error: ErrNotNumber };
	return { ok: true, value: v * multiplier };
}

// ---------------------------------------------------------------------------
// Generic helpers from internal/handlers (same names, same output).

/** handlers.changeClass: CSS tone for a signed value. */
export function changeClass(value: number): 'negative' | 'positive' | 'neutral' {
	if (value < 0) return 'negative';
	if (value > 0) return 'positive';
	return 'neutral';
}

/**
 * handlers.formatWithCommas (dashboard_data.go): integer part with commas, two
 * decimals only when the cents are non-zero. Negative fractions are dropped,
 * as in Go.
 */
export function formatWithCommas(value: number): string {
	let intPart = Math.trunc(value);
	let frac = goRound((value - intPart) * 100);
	if (frac === 100) {
		intPart++;
		frac = 0;
	}
	const s = String(intPart === 0 ? 0 : intPart);
	const cents = frac > 0 ? '.' + String(frac).padStart(2, '0') : '';
	if (s.length <= 3) return s + cents;
	let out = '';
	for (let i = 0; i < s.length; i++) {
		if (i > 0 && (s.length - i) % 3 === 0) out += ',';
		out += s[i];
	}
	return out + cents;
}

/** handlers.formatCurrency (dashboard_data.go): "$1.23M", "$12,345.60", "$12.50". USD only. */
export function formatCurrency(value: number): string {
	const abs = Math.abs(value);
	const sign = value < 0 ? '-' : '';
	if (abs >= 1_000_000) return `${sign}$${formatFloat(abs / 1_000_000, 2)}M`;
	if (abs >= 1_000) return `${sign}$${formatWithCommas(abs)}`;
	return `${sign}$${formatFloat(abs, 2)}`;
}

/** handlers.formatSignedCurrency (reports_data.go): "+$12.50", "-$3.00", "$0.00". */
export function formatSignedCurrency(value: number): string {
	if (value < 0) return '-' + formatCurrency(-value);
	if (value > 0) return '+' + formatCurrency(value);
	return formatCurrency(0);
}

/** handlers.formatSignedPercent (stock_detail_data.go): value already in percent. "+1.23%", "-0.50%". */
export function formatSignedPercent(value: number): string {
	const sign = value < 0 ? '' : '+';
	return `${sign}${formatFloat(value, 2)}%`;
}

/** handlers.formatPercent (portfolio_subpages_data.go): value already in percent, one decimal. "12.5%". */
export function formatPercentValue(value: number): string {
	return formatFloat(value, 1) + '%';
}

/** handlers.formatCompactNumber (stock_detail_data.go): "1.23B", "4.50M", "1.20K", "999". */
export function formatCompactNumber(value: number): string {
	if (value >= 1_000_000_000) return formatFloat(value / 1_000_000_000, 2) + 'B';
	if (value >= 1_000_000) return formatFloat(value / 1_000_000, 2) + 'M';
	if (value >= 1_000) return formatFloat(value / 1_000, 2) + 'K';
	return formatFloat(value, 0);
}

/** handlers.formatCompactCurrency (stock_detail_tabs_data.go): "$1.23B", "$4.50M", else formatCurrency. */
export function formatCompactCurrency(value: number): string {
	if (value >= 1_000_000_000) return '$' + formatFloat(value / 1_000_000_000, 2) + 'B';
	if (value >= 1_000_000) return '$' + formatFloat(value / 1_000_000, 2) + 'M';
	return formatCurrency(value);
}

/** handlers.formatMoney (economy_data.go): symbol (USD/EUR/BRL, else "CODE ") and a whole number, no separators. */
export function formatMoney(value: number, currencyCode: string): string {
	const symbol = ({ USD: '$', EUR: '€', BRL: 'R$' } as Record<string, string>)[currencyCode] || currencyCode + ' ';
	return symbol + formatFloat(value, 0);
}
