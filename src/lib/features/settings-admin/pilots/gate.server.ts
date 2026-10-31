import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { apiFetch, apiJSON, isAPIError } from '#lib/server/api.js';

// Port of norviq-web internal/middleware/pilots.go (AttachPilotsAvailability +
// RequirePilots), the pilots-only client setup in internal/handlers/pilots.go,
// and pilotLoadFailure.
//
// There is no config route for the flag: the backend 404s every pilots route
// while PILOTS_ENABLED is off. So the probe is GET /v1/pilots itself. 2xx is on,
// 404 is off, and both are cached for a minute. An outage (5xx, a timeout) is
// also off, cached only briefly. A rejected token (401/403) is off for that
// request only and leaves the cache alone. Like Go's per-process cache, one copy
// per Worker isolate serves every reader; concurrent misses share one probe.

const PILOTS_PROBE_TTL = 60_000;
const PILOTS_PROBE_FAILURE_TTL = 10_000;
const PILOTS_PROBE_TIMEOUT = 3_000;
/** pilotsClientTimeout: matches the crypto markets client. */
export const PILOTS_CLIENT_TIMEOUT = 15_000;

interface ProbeResult {
	enabled: boolean;
	/** 0: belongs to the asking request only; do not cache. */
	ttl: number;
}

let cached: { enabled: boolean; expires: number } | null = null;
let inflight: Promise<ProbeResult> | null = null;

async function probePilots(event: RequestEvent): Promise<ProbeResult> {
	try {
		await apiJSON<unknown[]>(event, 'GET', '/v1/pilots', undefined, {
			signal: AbortSignal.timeout(PILOTS_PROBE_TIMEOUT)
		});
		return { enabled: true, ttl: PILOTS_PROBE_TTL };
	} catch (err) {
		if (isAPIError(err) && err.status === 404) return { enabled: false, ttl: PILOTS_PROBE_TTL };
		if (isAPIError(err) && (err.status === 401 || err.status === 403)) {
			console.debug('pilots probe rejected for this user; not cached', err);
			return { enabled: false, ttl: 0 };
		}
		console.debug('pilots probe failed; pilot surfaces hidden', err);
		return { enabled: false, ttl: PILOTS_PROBE_FAILURE_TTL };
	}
}

/**
 * pilotgate.Enabled: whether the backend has pilots on. Reusable by any surface
 * that showed pilot entry points in Go (congress feed, portfolio workspace).
 */
export async function pilotsEnabled(event: RequestEvent): Promise<boolean> {
	if (!event.locals.session.accessToken) return false;
	if (cached && Date.now() < cached.expires) return cached.enabled;
	inflight ??= probePilots(event).then((result) => {
		if (result.ttl > 0) cached = { enabled: result.enabled, expires: Date.now() + result.ttl };
		return result;
	});
	const pending = inflight;
	try {
		return (await pending).enabled;
	} finally {
		if (inflight === pending) inflight = null;
	}
}

/** middleware.RequirePilots: a stale bookmark looks exactly like a route that does not exist. */
export async function requirePilots(event: RequestEvent): Promise<void> {
	if (!(await pilotsEnabled(event))) error(404, 'Not Found');
}

/**
 * pilotLoadFailure: a 404 (unknown slug, someone else's follow, or the flag
 * turned off since the probe cached) is a 404. A 401 is a session the backend no
 * longer accepts: it is cleared and the reader signs in again, coming back here
 * afterwards. Anything else is a 502.
 */
export async function pilotLoadFailure(event: RequestEvent, status: number): Promise<never> {
	if (status === 404) error(404, 'Not Found');
	if (status === 401) {
		// session.ClearAuth: drop the tokens, keep the other session flags.
		delete event.locals.session.data.auth;
		await event.locals.session.save();
		redirect(303, '/login?next=' + encodeURIComponent(event.url.pathname + event.url.search));
	}
	error(502, 'Pilots are unavailable right now. Try again shortly.');
}

/** Result of a pilots call: data on 2xx, else the HTTP status (0 when the call never completed) and body. */
export type PilotsResult<T> =
	{ ok: true; status: number; data: T } | { ok: false; status: number; body: unknown };

/**
 * One pilots API call through the session bearer. Mirrors the generated
 * pilotsapi client's *WithResponse: the caller sees the status and body and
 * decides, instead of an exception.
 */
export async function pilotsCall<T>(
	event: RequestEvent,
	method: string,
	path: string,
	input?: unknown,
	headers: Record<string, string> = {}
): Promise<PilotsResult<T>> {
	let res: Response;
	try {
		const h = { ...headers };
		let body: string | undefined;
		if (input !== undefined) {
			body = JSON.stringify(input);
			h['Content-Type'] = 'application/json';
		}
		res = await apiFetch(event, method, path, body, {
			headers: h,
			signal: AbortSignal.timeout(PILOTS_CLIENT_TIMEOUT)
		});
	} catch (err) {
		console.warn('pilots call', method, path, err);
		return { ok: false, status: 0, body: undefined };
	}
	const text = await res.text().catch(() => '');
	let parsed: unknown = text;
	if (text) {
		try {
			parsed = JSON.parse(text);
		} catch {
			/* not JSON */
		}
	}
	if (res.ok) return { ok: true, status: res.status, data: (text ? parsed : undefined) as T };
	return { ok: false, status: res.status, body: parsed };
}
