import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import type { PilotFollowingVM } from '#lib/components/norviq/PilotFollowingBanner.svelte';

// middleware.AttachPilotsAvailability + handlers.pilotFollowingByPortfolio.
//
// There is no config route for PILOTS_ENABLED: GET /v1/pilots is the probe.
// 2xx on, 404 off (cached 60s); an outage is off, cached 10s; a 401/403 is off
// for this request only. One answer per Worker isolate, like Go's per-process
// cache.

let cache: { enabled: boolean; expires: number } | null = null;

export async function pilotsEnabled(event: RequestEvent): Promise<boolean> {
	if (!event.locals.session.accessToken) return false;
	if (cache && Date.now() < cache.expires) return cache.enabled;
	try {
		await apiJSON(event, 'GET', '/v1/pilots', undefined, { signal: AbortSignal.timeout(3000) });
		cache = { enabled: true, expires: Date.now() + 60_000 };
		return true;
	} catch (err) {
		if (isAPIError(err) && (err.status === 401 || err.status === 403)) return false;
		const notFound = isAPIError(err) && err.status === 404;
		cache = { enabled: false, expires: Date.now() + (notFound ? 60_000 : 10_000) };
		return false;
	}
}

interface PilotFollowResponse {
	id: string;
	pilot: { displayName: string };
	portfolioListId?: string | null;
	status: string;
}

/**
 * Lower-cased portfolio id → the pilot follow that writes it. Best effort:
 * null when pilots are off or the lookup fails (2s budget).
 */
export async function pilotFollowingByPortfolio(
	event: RequestEvent,
	enabled?: boolean
): Promise<Record<string, PilotFollowingVM> | null> {
	if (!(enabled ?? (await pilotsEnabled(event)))) return null;
	try {
		const follows = await apiJSON<PilotFollowResponse[]>(
			event,
			'GET',
			'/v1/pilot-follows',
			undefined,
			{
				signal: AbortSignal.timeout(2000)
			}
		);
		const out: Record<string, PilotFollowingVM> = {};
		for (const f of follows ?? []) {
			if (!f.portfolioListId) continue;
			out[f.portfolioListId.toLowerCase()] = {
				pilotName: f.pilot?.displayName ?? '',
				followHref: '/pilot-follows/' + f.id.toLowerCase(),
				paused: f.status === 'paused'
			};
		}
		return out;
	} catch {
		return null;
	}
}
