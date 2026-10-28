import createClient, { type Client } from 'openapi-fetch';
import type { RequestEvent } from '@sveltejs/kit';
import type { paths } from '#lib/api/schema.js';
import { config } from './env';

// Backend access for server code. Mirrors norviq-web internal/api:
//
//   - every request carries X-StockPlan-Client-Capabilities (capabilities.go);
//   - user calls carry the session's bearer token (middleware.BearerEditor);
//   - public pages use PUBLIC_API_TOKEN, never a session;
//   - the reader's IP travels to the backend for rate limiting. The Go web
//     sat in-cluster and sent X-Forwarded-For, which the backend trusted from
//     its pod network. A Worker is outside the cluster, so it sends
//     X-Norviq-Client-IP plus X-Norviq-Edge-Key, which the backend trusts only
//     when the key matches its EDGE_CLIENT_IP_KEY.
//
// Use `api(event)` for the generated, typed client; `apiJSON` for routes the
// spec gets wrong (the Go web hand-writes those too: see its *_test-free
// clients in internal/api/*.go).

export const CLIENT_CAPABILITIES_HEADER = 'X-StockPlan-Client-Capabilities';
export const CLIENT_CAPABILITIES = 'mfa-auth-v1, ai-consent-v1';

export class APIError extends Error {
	constructor(
		public status: number,
		public reason: string,
		public code?: string,
		public body?: unknown
	) {
		super(reason || `backend returned ${status}`);
		this.name = 'APIError';
	}

	get unauthorized() {
		return this.status === 401;
	}
	get forbidden() {
		return this.status === 403;
	}
	get notFound() {
		return this.status === 404;
	}
}

export function clientIP(event: Pick<RequestEvent, 'request' | 'getClientAddress'>): string {
	const cf = event.request.headers.get('CF-Connecting-IP');
	if (cf) return cf;
	try {
		return event.getClientAddress();
	} catch {
		return '';
	}
}

type Auth = 'session' | 'public' | 'none' | { token: string };

function baseHeaders(event: RequestEvent, auth: Auth): Headers {
	const cfg = config();
	const h = new Headers();
	h.set(CLIENT_CAPABILITIES_HEADER, CLIENT_CAPABILITIES);
	h.set('Accept', 'application/json');
	const lang = event.locals.locale;
	if (lang) h.set('Accept-Language', lang);
	const ip = clientIP(event);
	if (ip) {
		if (cfg.edgeClientIPKey) {
			h.set('X-Norviq-Client-IP', ip);
			h.set('X-Norviq-Edge-Key', cfg.edgeClientIPKey);
		} else {
			// Local dev against a port-forwarded API: the backend sees a
			// loopback peer and ignores this, which is fine.
			h.set('X-Forwarded-For', ip);
		}
	}
	let token = '';
	if (auth === 'session') token = event.locals.session.accessToken;
	else if (auth === 'public') token = cfg.publicAPIToken;
	else if (typeof auth === 'object') token = auth.token;
	if (token) h.set('Authorization', `Bearer ${token}`);
	return h;
}

/** Typed client for the backend OpenAPI spec. */
export function api(event: RequestEvent, auth: Auth = 'session'): Client<paths> {
	const headers = baseHeaders(event, auth);
	return createClient<paths>({
		baseUrl: config().backendURL,
		headers: Object.fromEntries(headers.entries()),
		fetch: (req) => fetch(req)
	});
}

async function problemFrom(res: Response): Promise<APIError> {
	const text = await res.text().catch(() => '');
	let reason = '';
	let code: string | undefined;
	let body: unknown = text;
	try {
		const parsed = JSON.parse(text) as { reason?: string; error?: unknown; code?: string };
		body = parsed;
		reason = (parsed.reason ?? (typeof parsed.error === 'string' ? parsed.error : '')).trim();
		code = parsed.code;
	} catch {
		/* not JSON */
	}
	return new APIError(res.status, reason, code, body);
}

/** Throws APIError for openapi-fetch results that failed. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
	if (result.response.ok) return result.data as T;
	const e = result.error as { reason?: string; error?: unknown; code?: string } | undefined;
	const reason = (e?.reason ?? (typeof e?.error === 'string' ? e.error : '')) || '';
	throw new APIError(result.response.status, reason, e?.code, e);
}

export interface RawOptions {
	auth?: Auth;
	query?: Record<string, string | number | boolean | undefined | null>;
	headers?: Record<string, string>;
	signal?: AbortSignal;
}

/** Raw backend fetch: returns the Response untouched (streams, files, proxying). */
export async function apiFetch(
	event: RequestEvent,
	method: string,
	path: string,
	body?: BodyInit | null,
	opts: RawOptions = {}
): Promise<Response> {
	const url = new URL(config().backendURL + path);
	for (const [k, v] of Object.entries(opts.query ?? {})) {
		if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
	}
	const headers = baseHeaders(event, opts.auth ?? 'session');
	for (const [k, v] of Object.entries(opts.headers ?? {})) headers.set(k, v);
	return fetch(url, { method, headers, body: body ?? undefined, signal: opts.signal });
}

/** Equivalent of Go's Service.DoJSON: JSON in, JSON out, APIError on non-2xx. */
export async function apiJSON<T = unknown>(
	event: RequestEvent,
	method: string,
	path: string,
	input?: unknown,
	opts: RawOptions = {}
): Promise<T> {
	const headers = { ...(opts.headers ?? {}) };
	let body: string | undefined;
	if (input !== undefined) {
		body = JSON.stringify(input);
		headers['Content-Type'] = 'application/json';
	}
	const res = await apiFetch(event, method, path, body, { ...opts, headers });
	if (!res.ok) throw await problemFrom(res);
	if (res.status === 204) return undefined as T;
	const text = await res.text();
	return (text ? JSON.parse(text) : undefined) as T;
}

export const isAPIError = (e: unknown): e is APIError => e instanceof APIError;
