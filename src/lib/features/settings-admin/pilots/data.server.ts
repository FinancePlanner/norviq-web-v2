import type { RequestEvent } from '@sveltejs/kit';
import { api } from '#lib/server/api.js';
import { pilotLoadFailure, pilotsCall } from './gate.server.js';
import { pilotFollowRowVM, uuidString } from './vm.js';
import type { FollowRowVM, PilotDetail, PilotFollowResponse, WatchlistOptionVM } from './types.js';

// Server-side loaders shared by the pilot pages (handlers/pilots.go,
// pilot_detail.go, pilot_follow_form.go).

/** loadPilotFollowRows is best effort: a page that lists pilots still renders when follows cannot be read. */
export async function loadPilotFollowRows(event: RequestEvent): Promise<FollowRowVM[]> {
	const res = await pilotsCall<PilotFollowResponse[]>(event, 'GET', '/v1/pilot-follows');
	if (!res.ok || res.status !== 200 || !Array.isArray(res.data)) return [];
	return res.data.map(pilotFollowRowVM);
}

/** loadPilotDetail: the pilot and 200, or null and the status to answer with (502 when the call never completed). */
export async function loadPilotDetail(
	event: RequestEvent,
	slug: string
): Promise<{ detail: PilotDetail | null; status: number }> {
	if (slug === '') return { detail: null, status: 404 };
	const res = await pilotsCall<PilotDetail>(event, 'GET', '/v1/pilots/' + encodeURIComponent(slug));
	if (res.status === 0) {
		console.warn('load pilot', slug, 'transport error');
		return { detail: null, status: 502 };
	}
	if (!res.ok || res.status !== 200 || !res.data) {
		console.warn('load pilot', slug, 'status', res.status);
		return { detail: null, status: res.status };
	}
	return { detail: res.data, status: 200 };
}

/** pilotForForm: the pilot named in the URL, or answers the request itself (404 / 401 / 502). */
export async function pilotForForm(event: RequestEvent): Promise<PilotDetail> {
	const { detail, status } = await loadPilotDetail(event, (event.params.slug ?? '').trim());
	if (!detail) return pilotLoadFailure(event, status);
	return detail;
}

/** pilotWatchlistOptions: best effort; the form still offers a new watchlist when the list cannot be read. */
export async function pilotWatchlistOptions(event: RequestEvent): Promise<WatchlistOptionVM[]> {
	try {
		const res = await api(event).GET('/v1/watchlist/lists');
		if (res.response.status !== 200 || !res.data) return [];
		return res.data.map((list) => ({ id: uuidString(list.id), name: list.name }));
	} catch {
		return [];
	}
}
