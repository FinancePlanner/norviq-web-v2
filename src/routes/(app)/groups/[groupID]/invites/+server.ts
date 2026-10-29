import type { RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { createGroupInviteLink, groupsAction } from '#lib/features/social/groups/groups.server.js';

// GroupsCreateInvite: a link with the backend's defaults (7 days, unlimited).
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	return groupsAction(event, 'link', (groupID) => createGroupInviteLink(event, groupID));
};
