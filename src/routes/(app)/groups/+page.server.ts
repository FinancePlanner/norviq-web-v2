import type { PageServerLoad } from './$types';
import { requireGroups, groupsPublicOn } from '#lib/features/social/gates.server.js';
import {
	groupInvitations,
	groupsFailure,
	myGroups
} from '#lib/features/social/groups/groups.server.js';
import { card, groupNotice, groupsError } from '#lib/features/social/groups/view.js';
import type { GroupInvitation, InvitationRow } from '#lib/features/social/groups/types.js';

// GroupsHome (norviq-web internal/handlers/groups.go): invitations, then the
// viewer's groups by latest activity.
export const load: PageServerLoad = async (event) => {
	const cfg = await requireGroups(event);
	let list;
	try {
		list = await myGroups(event);
	} catch (err) {
		groupsFailure(err, event.url.pathname);
	}
	const now = new Date();
	const invitations: InvitationRow[] = [];
	if (list.pendingInvitationCount > 0) {
		let items: GroupInvitation[] = [];
		try {
			items = await groupInvitations(event);
		} catch (err) {
			console.warn('group invitations load failed', err);
		}
		for (const invitation of items) {
			invitations.push({
				id: invitation.id,
				group: card(invitation.group, now),
				inviter: invitation.inviterUsername ?? ''
			});
		}
	}
	return {
		groups: (list.items ?? []).map((g) => card(g, now)),
		invitations,
		canDiscover: groupsPublicOn(cfg),
		notice: groupNotice(event.url),
		error: groupsError(event.url)
	};
};
