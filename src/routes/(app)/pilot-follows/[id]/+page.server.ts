import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	pilotLoadFailure,
	pilotsCall,
	requirePilots
} from '#lib/features/settings-admin/pilots/gate.server.js';
import {
	PILOT_FOLLOW_STOP_FAILED_COPY,
	PILOT_FOLLOW_UPDATE_FAILED_COPY,
	applyPilotSnapshots,
	buildPilotFollowDetailVM,
	isUUID,
	pilotEventRows,
	uuidString
} from '#lib/features/settings-admin/pilots/vm.js';
import type {
	PilotFollowEventResponse,
	PilotFollowResponse,
	PilotFollowSnapshotResponse
} from '#lib/features/settings-admin/pilots/types.js';

/** pilotFollowIDFrom: anything but a UUID is a 404. Lower-cased, as uuid.UUID.String() prints it. */
function followIDFrom(event: RequestEvent): string {
	const raw = (event.params.id ?? '').trim();
	if (!isUUID(raw)) error(404, 'Not Found');
	return uuidString(raw);
}

const q = (key: string, value: string) => '?' + new URLSearchParams({ [key]: value }).toString();

// handlers.PilotFollowDetail: where a follow copies to, its simulated value over
// time, every copied trade, and the controls to pause or stop it.
export const load: PageServerLoad = async (event) => {
	await requirePilots(event);
	const followID = followIDFrom(event);
	const res = await pilotsCall<PilotFollowResponse>(event, 'GET', '/v1/pilot-follows/' + followID);
	if (res.status === 0) return pilotLoadFailure(event, 0);
	if (!res.ok || res.status !== 200 || !res.data) return pilotLoadFailure(event, res.status);
	const follow = res.data;
	const vm = buildPilotFollowDetailVM(follow);
	vm.notice = (event.url.searchParams.get('notice') ?? '').trim();
	vm.error = (event.url.searchParams.get('error') ?? '').trim();

	const [events, snaps] = await Promise.all([
		pilotsCall<PilotFollowEventResponse[]>(event, 'GET', `/v1/pilot-follows/${followID}/events`),
		vm.isPortfolio
			? pilotsCall<PilotFollowSnapshotResponse[]>(
					event,
					'GET',
					`/v1/pilot-follows/${followID}/snapshots`
				)
			: Promise.resolve(null)
	]);
	if (!events.ok || events.status !== 200 || !Array.isArray(events.data)) vm.eventsError = true;
	else vm.events = pilotEventRows(events.data);
	if (snaps) {
		if (snaps.ok && snaps.status === 200 && Array.isArray(snaps.data))
			applyPilotSnapshots(vm, follow, snaps.data);
		else vm.chartNote = 'The value history is unavailable right now.';
	}
	return { vm, title: 'Following ' + follow.pilot.displayName, activePath: '/markets' };
};

export const actions: Actions = {
	// handlers.PilotFollowStatus (POST /pilot-follows/{id}/status): pause or resume.
	status: async (event) => {
		await requirePilots(event);
		const followID = followIDFrom(event);
		let form: FormData;
		try {
			form = await event.request.formData();
		} catch {
			error(400, 'Invalid form submission.');
		}
		const status = String(form.get('status') ?? '').trim();
		if (status !== 'active' && status !== 'paused') error(400, 'Invalid status.');
		const page = '/pilot-follows/' + followID;
		const res = await pilotsCall<PilotFollowResponse>(
			event,
			'PATCH',
			'/v1/pilot-follows/' + followID,
			{ status }
		);
		if (res.status === 0) {
			console.warn('update pilot follow', 'transport error');
			redirect(303, page + q('error', PILOT_FOLLOW_UPDATE_FAILED_COPY));
		}
		if (res.status === 404) error(404, 'Not Found');
		if (!res.ok || res.status !== 200) {
			console.warn('update pilot follow', 'status', res.status);
			redirect(303, page + q('error', PILOT_FOLLOW_UPDATE_FAILED_COPY));
		}
		if (status === 'paused')
			redirect(303, page + q('notice', 'Paused. No new trades are copied until you resume.'));
		redirect(
			303,
			page + q('notice', 'Resumed. Norviq catches up on the latest disclosures within a few hours.')
		);
	},

	// handlers.PilotFollowStop (POST /pilot-follows/{id}/stop): the backend keeps
	// the portfolio or watchlist it wrote to, and the notice says so.
	stop: async (event) => {
		await requirePilots(event);
		const followID = followIDFrom(event);
		const page = '/pilot-follows/' + followID;
		const res = await pilotsCall<unknown>(event, 'DELETE', '/v1/pilot-follows/' + followID);
		if (res.status === 0) {
			console.warn('stop pilot follow', 'transport error');
			redirect(303, page + q('error', PILOT_FOLLOW_STOP_FAILED_COPY));
		}
		if (res.status === 404) error(404, 'Not Found');
		if (res.status !== 204 && res.status !== 200) {
			console.warn('stop pilot follow', 'status', res.status);
			redirect(303, page + q('error', PILOT_FOLLOW_STOP_FAILED_COPY));
		}
		redirect(
			303,
			'/pilots' +
				q(
					'notice',
					'Stopped following. The portfolio or watchlist and everything copied into it are kept.'
				)
		);
	}
};
