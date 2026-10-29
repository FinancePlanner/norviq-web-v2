import type { RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { groupsAction, updateGroup, readForm } from '#lib/features/social/groups/groups.server.js';
import type { UpdateGroupRequest } from '#lib/features/social/groups/types.js';

// GroupsEdit: name, description and emoji always; the ticker only when the
// form sent one.
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const form = await readForm(event);
	const value = (k: string) => String(form.get(k) ?? '').trim();
	const request: UpdateGroupRequest = { name: value('name'), description: value('description'), iconEmoji: value('emoji') };
	if (form.has('ticker')) request.ticker = value('ticker');
	return groupsAction(event, 'saved', (groupID) => updateGroup(event, groupID, request));
};
