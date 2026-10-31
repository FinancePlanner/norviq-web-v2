// Client-safe helpers from norviq-web internal/pages/scenarios/page.templ
// (and the identical ones in internal/handlers/scenario_pdf.go).
import { formatFloat } from '#lib/format.js';
import type { ScenarioRun } from './types.js';

type Obj = Record<string, unknown>;

/** uuid.UUID.String(): the Go web always printed ids lower-case. */
export const uid = (id: string | null | undefined) => (id ?? '').toLowerCase();

export const isActive = (run: ScenarioRun) => run.state === 'queued' || run.state === 'running';

/** resultJSON: json.MarshalIndent(result, "", "  "). */
export function resultJSON(result: unknown): string {
	if (result === undefined || result === null) return '';
	try {
		return JSON.stringify(result, null, 2);
	} catch {
		return 'Result could not be displayed.';
	}
}

export function objectArray(value: unknown): Obj[] {
	if (!Array.isArray(value)) return [];
	return value.filter(
		(item): item is Obj => typeof item === 'object' && item !== null && !Array.isArray(item)
	);
}

export function objectFrom(value: unknown): Obj {
	return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Obj) : {};
}

/** numberFrom: object[key].(float64), 0 when absent or not a number. */
export function numberFrom(object: Obj | null | undefined, key: string): number {
	const value = object?.[key];
	return typeof value === 'number' ? value : 0;
}

export function optionalNumber(object: Obj | null | undefined, key: string): number | null {
	const value = object?.[key];
	return typeof value === 'number' ? value : null;
}

export function textFrom(object: Obj, key: string): string {
	const value = object[key];
	return typeof value === 'string' ? value : '';
}

/** fmt "%+.Nf". */
export function signedFixed(value: number, prec: number): string {
	const s = formatFloat(value, prec);
	return s.startsWith('-') ? s : '+' + s;
}

export const formatOptionalPercent = (value: number | null) =>
	value === null ? '—' : formatFloat(value * 100, 1) + '%';
export const formatOptionalMonths = (value: number | null) =>
	value === null ? '—' : formatFloat(value, 1) + ' mo';
export const formatOptionalMoney = (value: number | null) =>
	value === null ? '—' : signedFixed(value, 0) + ' / mo';

function goExponent(mantissa: string, exp: number): string {
	const abs = Math.abs(exp);
	return `${mantissa}e${exp < 0 ? '-' : '+'}${abs < 10 ? '0' + abs : abs}`;
}

/** fmt "%.Ng" (precision > 0): N significant digits, trailing zeros dropped. */
export function goG(value: number, prec: number): string {
	if (!Number.isFinite(value)) return formatFloat(value, -1);
	if (value === 0) return Object.is(value, -0) ? '-0' : '0';
	const [m, e] = value.toExponential(prec - 1).split('e');
	const exp = Number(e);
	const mantissa = m.includes('.') ? m.replace(/0+$/, '').replace(/\.$/, '') : m;
	if (exp < -4 || exp >= prec) return goExponent(mantissa, exp);
	return formatFloat(Number(value.toPrecision(prec)), -1);
}

/** fmt.Sprint(v) for a value decoded from JSON into `any`. */
export function goSprint(value: unknown): string {
	if (value === null || value === undefined) return '<nil>';
	if (typeof value === 'string') return value;
	if (typeof value === 'boolean') return String(value);
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return formatFloat(value, -1);
		if (value === 0) return Object.is(value, -0) ? '-0' : '0';
		// %v on float64 is %g with the shortest digits, which switches to the
		// exponent form below 1e-4 and from 1e6 up (1e6 prints "1e+06").
		const [m, e] = value.toExponential().split('e');
		const exp = Number(e);
		if (exp < -4 || exp >= 6) return goExponent(m, exp);
		return formatFloat(value, -1);
	}
	if (Array.isArray(value)) return '[' + value.map(goSprint).join(' ') + ']';
	if (typeof value === 'object') {
		const entries = Object.keys(value as Obj)
			.sort()
			.map((k) => `${k}:${goSprint((value as Obj)[k])}`);
		return 'map[' + entries.join(' ') + ']';
	}
	return String(value);
}
