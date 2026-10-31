import { redirect, type RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import {
	declineGroupInvitation,
	groupsID,
	groupsRedirectError
} from '#lib/features/social/groups/groups.server.js';

// GroupsDeclineInvitation
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const id = groupsID(event.params.invitationID);
	try {
		await declineGroupInvitation(event, id);
	} catch (err) {
		groupsRedirectError(err, '/groups', event.url.pathname);
	}
	redirect(303, '/groups?notice=declined');
};
