import type { PageServerLoad } from './$types';
import {
	pilotLoadFailure,
	pilotsCall,
	requirePilots
} from '#lib/features/settings-admin/pilots/gate.server.js';
import { loadPilotFollowRows } from '#lib/features/settings-admin/pilots/data.server.js';
import { followHrefForPilot, pilotCardVM } from '#lib/features/settings-admin/pilots/vm.js';
import type { BrowseVM, PilotSummary } from '#lib/features/settings-admin/pilots/types.js';

// handlers.PilotsBrowse: the politicians and funds a user can follow.
// requirePilots 404s while the probe sees the flag off; the 404 check below
// covers a flag turned off since the probe cached.
export const load: PageServerLoad = async (event) => {
	await requirePilots(event);
	const vm: BrowseVM = {
		politicians: [],
		funds: [],
		follows: [],
		notice: (event.url.searchParams.get('notice') ?? '').trim(),
		loadError: false
	};

	// fillPilotsBrowse
	const res = await pilotsCall<PilotSummary[]>(event, 'GET', '/v1/pilots');
	if (!res.ok || res.status !== 200 || !Array.isArray(res.data)) {
		console.warn('list pilots', 'status', res.status);
		vm.loadError = true;
		if (res.status === 404 || res.status === 401) await pilotLoadFailure(event, res.status);
	} else {
		vm.follows = await loadPilotFollowRows(event);
		for (const p of res.data) {
			const card = pilotCardVM(p, followHrefForPilot(vm.follows, p.slug));
			if (p.kind === 'fund') vm.funds.push(card);
			else vm.politicians.push(card);
		}
	}
	// Go rendered pilot pages under the Markets nav section (pilotsActivePath).
	return { vm, activePath: '/markets' };
};
