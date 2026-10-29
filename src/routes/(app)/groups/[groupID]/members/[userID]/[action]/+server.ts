import type { RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import {
	banGroupMember,
	groupsAction,
	groupsID,
	kickGroupMember,
	refusal,
	setGroupMemberRole,
	transferGroup
} from '#lib/features/social/groups/groups.server.js';

// GroupsMember runs a member action: role, kick, ban or transfer.
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const userID = groupsID(event.params.userID);
	const action = event.params.action;
	const form = await event.request.formData();
	return groupsAction(event, 'member', async (groupID) => {
		switch (action) {
			case 'role': {
				const role = String(form.get('role') ?? '');
				if (role !== 'admin' && role !== 'member') throw refusal(422, 'Unknown role.');
				return setGroupMemberRole(event, groupID, userID, role);
			}
			case 'kick':
				return kickGroupMember(event, groupID, userID);
			case 'ban':
				return banGroupMember(event, groupID, userID);
			case 'transfer':
				return transferGroup(event, groupID, userID);
			default:
				throw refusal(404);
		}
	});
};
