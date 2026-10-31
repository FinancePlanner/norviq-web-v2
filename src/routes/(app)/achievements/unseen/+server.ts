import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAchievements } from '#lib/features/social/gates.server.js';
import { loadUnseenToast } from '#lib/features/achievements/achievements.server.js';

// GET /achievements/unseen — handlers.AchievementsUnseen, the lazy unlock
// toast. Go answered the toast HTML (or an empty 200); this answers the toast
// model as JSON ({toast: null} for nothing) and UnlockToast.svelte renders it.
export const GET: RequestHandler = async (event) => {
	await requireAchievements(event);
	return json(
		{ toast: await loadUnseenToast(event) },
		{ headers: { 'cache-control': 'no-store' } }
	);
};
