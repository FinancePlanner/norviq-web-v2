import type { RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { groupsAction, groupsID, revokeGroupInvite } from '#lib/features/social/groups/groups.server.js';

// GroupsRevokeInvite
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const inviteID = groupsID(event.params.inviteID);
	return groupsAction(event, 'revoked', () => revokeGroupInvite(event, inviteID));
};
