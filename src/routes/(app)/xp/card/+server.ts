import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLeaderboards } from '#lib/features/social/gates.server.js';
import { loadXPCard } from '#lib/features/social/friends/friends.server.js';

// GET /xp/card (handlers.XPCard): the dashboard card's lazy load, as JSON for
// XPCardShell (Go rendered the friends.XPCard fragment here). It aggregates
// XP + streaks + the viewer's "today" server-side, with X-Timezone.
export const GET: RequestHandler = async (event) => {
	await requireLeaderboards(event);
	return json(await loadXPCard(event));
};
