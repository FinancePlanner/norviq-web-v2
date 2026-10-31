import type { RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import {
	createGroupChannel,
	groupsAction,
	readForm
} from '#lib/features/social/groups/groups.server.js';

// GroupsCreateChannel: lower-cased, without a leading #.
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	let name = String((await readForm(event)).get('name') ?? '')
		.trim()
		.toLowerCase();
	if (name.startsWith('#')) name = name.slice(1);
	return groupsAction(event, 'channel', (groupID) => createGroupChannel(event, groupID, name));
};
