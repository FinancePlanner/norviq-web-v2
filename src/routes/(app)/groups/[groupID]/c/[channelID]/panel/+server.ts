import { error, json, text, type RequestHandler } from '@sveltejs/kit';
import { isAPIError } from '#lib/server/api.js';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { getGroup, groupsID } from '#lib/features/social/groups/groups.server.js';
import { channelItems } from '#lib/features/social/groups/view.js';
import type { ChannelPanelVM, GroupDetail } from '#lib/features/social/groups/types.js';

// GroupsChannelPanel: the channel list (Go: ChannelPanel fragment, here JSON
// for GroupChat), reloaded when a channel changes or another channel gets a
// message.
export const GET: RequestHandler = async (event) => {
	await requireGroups(event);
	const groupID = groupsID(event.params.groupID);
	const channelID = groupsID(event.params.channelID);
	let detail: GroupDetail;
	try {
		detail = await getGroup(event, groupID);
	} catch (err) {
		if (isAPIError(err) && err.status === 404) error(404, 'Not Found');
		return text('unavailable', { status: 502 });
	}
	const vm: ChannelPanelVM = {
		groupId: groupID,
		groupName: detail.group.name,
		emoji: detail.group.iconEmoji ?? '',
		ticker: detail.group.ticker ?? '',
		channelId: channelID,
		channels: channelItems(detail, channelID),
		canInvite: detail.permissions.canInvite,
		canManage: detail.permissions.canManageChannels
	};
	return json(vm, { headers: { 'cache-control': 'private, no-store' } });
};
