import type { RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { uuidParam } from '#lib/features/settings-admin/social/social.server.js';
import { groupsAction, inviteFriendsToGroup, refusal } from '#lib/features/social/groups/groups.server.js';

// GroupsInviteFriends
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const form = await event.request.formData();
	const userIDs = form.getAll('user').map(String).filter((id) => uuidParam(id) !== null);
	return groupsAction(event, 'invited', async (groupID) => {
		if (userIDs.length === 0) throw refusal(422, 'Pick at least one friend.');
		await inviteFriendsToGroup(event, groupID, userIDs);
	});
};
