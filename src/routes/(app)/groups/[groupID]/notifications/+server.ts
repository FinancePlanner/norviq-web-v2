import type { RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { groupsAction, setGroupPush, readForm } from '#lib/features/social/groups/groups.server.js';

// GroupsNotifications
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const enabled = String((await readForm(event)).get('push') ?? '') === 'on';
	return groupsAction(event, enabled ? 'unmuted' : 'muted', (groupID) =>
		setGroupPush(event, groupID, enabled)
	);
};
