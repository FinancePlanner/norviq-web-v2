import type { PageServerLoad } from './$types';
import { pilotLoadFailure, requirePilots } from '#lib/features/settings-admin/pilots/gate.server.js';
import { loadPilotDetail, loadPilotFollowRows } from '#lib/features/settings-admin/pilots/data.server.js';
import { buildPilotDetailVM } from '#lib/features/settings-admin/pilots/vm.js';

// handlers.PilotDetail: one pilot's current book, its recent disclosures, and
// the notes a follower needs before copying it (reporting lag, skipped puts).
export const load: PageServerLoad = async (event) => {
	await requirePilots(event);
	const { detail, status } = await loadPilotDetail(event, event.params.slug.trim());
	if (!detail) return pilotLoadFailure(event, status);
	const following = (await loadPilotFollowRows(event)).find((row) => row.pilotSlug === detail.pilot.slug) ?? null;
	return { vm: buildPilotDetailVM(detail, following), title: detail.pilot.displayName, activePath: '/markets' };
};
