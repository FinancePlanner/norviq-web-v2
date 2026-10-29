import { redirect, type RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { groupsID, groupsRedirectError, joinGroup } from '#lib/features/social/groups/groups.server.js';
import { groupLanding, withNotice } from '#lib/features/social/groups/view.js';
import type { GroupDetail } from '#lib/features/social/groups/types.js';

// GroupsJoin
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const groupID = groupsID(event.params.groupID);
	let detail: GroupDetail;
	try {
		detail = await joinGroup(event, groupID);
	} catch (err) {
		groupsRedirectError(err, '/groups/' + groupID, event.url.pathname);
	}
	redirect(303, withNotice(groupLanding(detail), 'joined'));
};
