import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { groupsPublicOn, requireGroups } from '#lib/features/social/gates.server.js';
import {
	getGroup,
	groupInviteLinks,
	groupMembers,
	groupsFailure,
	groupsID,
	invitableFriends,
	viewerID
} from '#lib/features/social/groups/groups.server.js';
import { card, channelItems, groupNotice, groupsError, inviteLinkRows, memberRows } from '#lib/features/social/groups/view.js';
import type { FriendOption, GroupDetail, GroupForm, InviteLinkRow, MemberRow } from '#lib/features/social/groups/types.js';

// GroupsSettings: notifications, invites, channels, members and the way out.
// Each section shows only what the viewer's role allows.
export const load: PageServerLoad = async (event) => {
	const cfg = await requireGroups(event);
	const groupID = groupsID(event.params.groupID);
	let detail: GroupDetail;
	try {
		detail = await getGroup(event, groupID);
	} catch (err) {
		groupsFailure(err, event.url.pathname);
	}
	const membership = detail.group.membership;
	if (!membership) redirect(303, '/groups/' + groupID);
	const perms = detail.permissions;
	const form: GroupForm = {
		name: detail.group.name,
		description: detail.group.description ?? '',
		emoji: detail.group.iconEmoji ?? '',
		topic: detail.group.topic,
		ticker: detail.group.ticker ?? '',
		visibility: detail.group.visibility
	};
	let members: MemberRow[] = [];
	try {
		const page = await groupMembers(event, groupID);
		members = memberRows(page.items ?? [], viewerID(event), membership.role, perms.canModerate);
	} catch (err) {
		console.warn('group members load failed', err);
	}
	let friends: FriendOption[] = [];
	let links: InviteLinkRow[] = [];
	if (perms.canInvite) {
		friends = await invitableFriends(event, members);
		if (perms.canModerate) {
			try {
				links = inviteLinkRows(await groupInviteLinks(event, groupID), new Date());
			} catch {
				/* Go leaves the list empty */
			}
		}
	}
	return {
		group: card(detail.group, new Date()),
		form,
		chatHref: '/groups/' + groupID,
		role: membership.role,
		pushEnabled: membership.pushEnabled,
		canEdit: perms.canEdit,
		canInvite: perms.canInvite,
		canModerate: perms.canModerate,
		canChannels: perms.canManageChannels,
		canDelete: perms.canDelete,
		isOwner: membership.role === 'owner',
		members,
		channels: channelItems(detail, ''),
		links,
		friends,
		publicAllowed: groupsPublicOn(cfg),
		notice: groupNotice(event.url),
		error: groupsError(event.url)
	};
};
