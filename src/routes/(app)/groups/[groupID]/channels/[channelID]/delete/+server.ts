import type { RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { deleteGroupChannel, groupsAction, groupsID } from '#lib/features/social/groups/groups.server.js';

// GroupsDeleteChannel
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const channelID = groupsID(event.params.channelID);
	return groupsAction(event, 'unchannel', () => deleteGroupChannel(event, channelID));
};
