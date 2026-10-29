import { redirect, type RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { acceptGroupInvitation, groupsID, groupsRedirectError } from '#lib/features/social/groups/groups.server.js';
import { groupLanding, withNotice } from '#lib/features/social/groups/view.js';
import type { GroupDetail } from '#lib/features/social/groups/types.js';

// GroupsAcceptInvitation
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const id = groupsID(event.params.invitationID);
	let detail: GroupDetail;
	try {
		detail = await acceptGroupInvitation(event, id);
	} catch (err) {
		groupsRedirectError(err, '/groups', event.url.pathname);
	}
	redirect(303, withNotice(groupLanding(detail), 'joined'));
};
