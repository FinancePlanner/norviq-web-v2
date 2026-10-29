import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireGroups } from '#lib/features/social/gates.server.js';
import {
	getGroup,
	groupMessages,
	groupsFailure,
	groupsID,
	GROUPS_PAGE_SIZE,
	lastChannelKey,
	myGroups,
	postBlockedReason,
	rowOptions
} from '#lib/features/social/groups/groups.server.js';
import type { ChatVM, GroupDetail, GroupListResponse, GroupMessagePage } from '#lib/features/social/groups/types.js';
import { buildRows, channelItems, groupNotice, groupsError, railItems } from '#lib/features/social/groups/view.js';

// GroupsChat: a channel page with the rail, channels and the newest messages.
export const load: PageServerLoad = async (event) => {
	await requireGroups(event);
	const groupID = groupsID(event.params.groupID);
	const channelID = groupsID(event.params.channelID);
	let detail: GroupDetail;
	try {
		detail = await getGroup(event, groupID);
	} catch (err) {
		groupsFailure(err, event.url.pathname);
	}
	if (!detail.group.membership) redirect(303, '/groups/' + groupID);
	const channel = (detail.channels ?? []).find((c) => c.id === channelID);
	if (!channel) redirect(303, '/groups/' + groupID);
	let page: GroupMessagePage;
	try {
		page = await groupMessages(event, channelID, { limit: GROUPS_PAGE_SIZE });
	} catch (err) {
		groupsFailure(err, event.url.pathname);
	}
	let list: GroupListResponse;
	try {
		list = await myGroups(event);
	} catch (err) {
		console.warn('groups rail load failed', err);
		list = { items: [], pendingInvitationCount: 0 };
	}
	await event.locals.session.set(lastChannelKey(groupID), channelID);

	const items = page.items ?? [];
	const vm: ChatVM = {
		groupId: groupID,
		groupName: detail.group.name,
		emoji: detail.group.iconEmoji ?? '',
		ticker: detail.group.ticker ?? '',
		channelId: channelID,
		channelName: channel.name,
		channelTopic: channel.topic ?? '',
		rail: railItems(list.items ?? [], groupID),
		channels: channelItems(detail, channelID),
		invitations: list.pendingInvitationCount,
		messages: buildRows(items, null, rowOptions(event, detail.permissions.canModerate, page.lastReadSeq)),
		oldestSeq: items.length > 0 ? items[0].seq : 0,
		lastSeq: items.length > 0 ? items[items.length - 1].seq : 0,
		hasMoreBefore: page.hasMoreBefore,
		canPost: detail.permissions.canPost,
		canInvite: detail.permissions.canInvite,
		canManage: detail.permissions.canManageChannels,
		canModerate: detail.permissions.canModerate,
		postBlocked: '',
		notice: groupNotice(event.url),
		error: groupsError(event.url)
	};
	if (!vm.canPost) vm.postBlocked = await postBlockedReason(event);
	return { vm, title: '#' + channel.name + ' · ' + detail.group.name + ' - Norviq' };
};
