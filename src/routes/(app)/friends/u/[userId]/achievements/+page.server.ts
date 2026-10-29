import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireActivityFeed } from '#lib/features/social/gates.server.js';
import { redirectWith, uuidParam } from '#lib/features/settings-admin/social/social.server.js';
import { achievementsDo, isNotFound, socialErrorMessage } from '#lib/features/social/friends/friends.server.js';
import type { AchievementUnlock } from '#lib/features/social/friends/types.js';

// Port of handlers.FriendAchievements: a friend's unlocks. The backend answers
// 404 when the viewer may not see them (not friends, blocked, or hidden).
export const load: PageServerLoad = async (event) => {
	await requireActivityFeed(event);
	const userID = uuidParam(event.params.userId);
	if (!userID) error(404, 'Not Found');
	let unlocks: AchievementUnlock[] | null;
	try {
		unlocks = await achievementsDo<AchievementUnlock[] | null>(event, 'GET', '/v1/social/users/' + userID + '/achievements');
	} catch (err) {
		if (isNotFound(err)) error(404, 'Not Found');
		redirectWith('/friends/u/' + userID, '', socialErrorMessage(err, 'Could not load their achievements.'));
	}
	return { userID, unlocks: unlocks ?? [] };
};
