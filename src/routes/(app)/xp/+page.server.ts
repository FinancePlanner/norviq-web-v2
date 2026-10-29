import type { PageServerLoad } from './$types';
import { requireLeaderboards } from '#lib/features/social/gates.server.js';
import { socialDo, socialErrorMessage } from '#lib/features/social/friends/friends.server.js';
import type { XPHistory, XPSummary } from '#lib/features/social/friends/types.js';

// Port of handlers.XPHistory: the summary is best-effort; the event list's
// failure is the page error.
export const load: PageServerLoad = async (event) => {
	await requireLeaderboards(event);
	const q = event.url.searchParams;
	let errorMessage = q.get('error') ?? '';
	let path = '/v1/gamification/xp/events';
	const cursor = q.get('cursor') ?? '';
	if (cursor !== '' && cursor.length <= 256) path += '?' + new URLSearchParams({ cursor });
	const [xpResult, historyResult] = await Promise.allSettled([
		socialDo<XPSummary>(event, 'GET', '/v1/gamification/xp'),
		socialDo<XPHistory>(event, 'GET', path)
	]);
	let history: XPHistory = {};
	if (historyResult.status === 'fulfilled') history = historyResult.value ?? {};
	else errorMessage ||= socialErrorMessage(historyResult.reason, 'Could not load your XP history.');
	return {
		notice: q.get('notice') ?? '',
		errorMessage,
		xp: xpResult.status === 'fulfilled' ? xpResult.value : null,
		events: history.events ?? [],
		nextCursor: history.nextCursor ?? ''
	};
};
