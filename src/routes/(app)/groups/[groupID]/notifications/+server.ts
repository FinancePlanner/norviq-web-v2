import type { RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { groupsAction, setGroupPush, readForm } from '#lib/features/social/groups/groups.server.js';
import { formValue } from '#lib/form-value.js';

// GroupsNotifications
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const enabled = formValue(await readForm(event), 'push') === 'on';
	return groupsAction(event, enabled ? 'unmuted' : 'muted', (groupID) =>
		setGroupPush(event, groupID, enabled)
	);
};
