import { isAPIError } from '#lib/server/api.js';

// Shared bits of handlers/portfolio_workspace.go, wealth_automation.go and
// internal/api (ParseFloat / ParseInt / formChoice / validUUID).

const STATUS_TEXT: Record<number, string> = {
	400: 'Bad Request',
	401: 'Unauthorized',
	402: 'Payment Required',
	403: 'Forbidden',
	404: 'Not Found',
	405: 'Method Not Allowed',
	409: 'Conflict',
	410: 'Gone',
	412: 'Precondition Failed',
	413: 'Request Entity Too Large',
	422: 'Unprocessable Entity',
	423: 'Locked',
	428: 'Precondition Required',
	429: 'Too Many Requests',
	500: 'Internal Server Error',
	501: 'Not Implemented',
	502: 'Bad Gateway',
	503: 'Service Unavailable',
	504: 'Gateway Timeout'
};

/** http.StatusText */
export const statusText = (status: number) => STATUS_TEXT[status] ?? '';

/**
 * portfolioAPIErrorMessage: the backend's reason, else the status text, but
 * never a bare "Internal Server Error". Go also surfaced transport errors
 * ("send request: …") verbatim; a JS fetch failure has no useful text, so
 * those fall back.
 */
export function portfolioAPIErrorMessage(err: unknown, fallback: string): string {
	if (!isAPIError(err)) return fallback;
	const message = (err.reason || statusText(err.status)).trim();
	if (message && message !== statusText(500)) return message;
	return fallback;
}

/** api.ParseFloat: strconv.ParseFloat on the trimmed value, 0 on error. */
export function parseFloatGo(value: FormDataEntryValue | null | undefined): number {
	const s = String(value ?? '').trim();
	if (s === '' || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return 0;
	return Number(s);
}

/** api.ParseInt: strconv.Atoi on the trimmed value, 0 on error. */
export function parseIntGo(value: FormDataEntryValue | null | undefined): number {
	const s = String(value ?? '').trim();
	return /^[+-]?\d+$/.test(s) ? Number(s) : 0;
}

/** parseOptionalFloat: "" → undefined, invalid → error. */
export function parseOptionalFloat(raw: FormDataEntryValue | null | undefined): { value?: number; error?: true } {
	const s = String(raw ?? '').trim();
	if (s === '') return {};
	if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return { error: true };
	return { value: Number(s) };
}

/** formChoice: the value when allowed, else the first allowed. */
export function formChoice(value: string, ...allowed: string[]): string {
	return allowed.includes(value) ? value : allowed[0];
}

/** validUUID (uuid.Parse); returns the canonical lower-case form. */
export function validUUID(raw: string | null | undefined): string | null {
	const v = (raw ?? '').trim();
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v.toLowerCase() : null;
}

export const formString = (form: FormData, key: string) => String(form.get(key) ?? '');
export const formAll = (form: FormData, key: string) => form.getAll(key).map((v) => String(v));
