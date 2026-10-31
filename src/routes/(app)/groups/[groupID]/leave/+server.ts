import { redirect, type RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import {
	groupsID,
	groupsRedirectError,
	lastChannelKey,
	leaveGroup
} from '#lib/features/social/groups/groups.server.js';

// GroupsLeave
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const groupID = groupsID(event.params.groupID);
	try {
		await leaveGroup(event, groupID);
	} catch (err) {
		groupsRedirectError(err, '/groups/' + groupID + '/settings', event.url.pathname);
	}
	await event.locals.session.remove(lastChannelKey(groupID));
	redirect(303, '/groups?notice=left');
};
