import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { groupsPublicOn, requireGroups } from '#lib/features/social/gates.server.js';
import {
	boardsErrorText,
	discoverGroups,
	groupsFailure,
	isServerFailure
} from '#lib/features/social/groups/groups.server.js';
import { card } from '#lib/features/social/groups/view.js';
import type { GroupCard } from '#lib/features/social/groups/types.js';

// GroupsDiscover: public groups by name, or by ticker with a $. 404 unless
// public groups are on.
export const load: PageServerLoad = async (event) => {
	const cfg = await requireGroups(event);
	if (!groupsPublicOn(cfg)) error(404, 'Not Found');
	let query = (event.url.searchParams.get('q') ?? '').trim();
	// Go slices bytes; a cut inside a rune is dropped.
	const bytes = new TextEncoder().encode(query);
	if (bytes.length > 64) query = new TextDecoder().decode(bytes.slice(0, 64)).replace(/�$/, '');
	let results: GroupCard[] = [];
	let next = '';
	let errorText = '';
	try {
		const page = await discoverGroups(event, query, event.url.searchParams.get('cursor') ?? '');
		const now = new Date();
		results = (page.items ?? []).map((g) => card(g, now));
		next = page.nextCursor ?? '';
	} catch (err) {
		if (isServerFailure(err)) groupsFailure(err, event.url.pathname);
		errorText = boardsErrorText(err);
	}
	return { query, results, next, error: errorText };
};
