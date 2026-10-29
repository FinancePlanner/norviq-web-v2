import { json, text, type RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { myGroups } from '#lib/features/social/groups/groups.server.js';
import { railItems } from '#lib/features/social/groups/view.js';
import type { GroupListResponse, RailResponse } from '#lib/features/social/groups/types.js';

// GroupsRail: the rail (Go: Rail fragment, here JSON for GroupChat),
// reloaded when another group changes.
export const GET: RequestHandler = async (event) => {
	await requireGroups(event);
	let list: GroupListResponse;
	try {
		list = await myGroups(event);
	} catch {
		return text('unavailable', { status: 502 });
	}
	const out: RailResponse = {
		rail: railItems(list.items ?? [], event.url.searchParams.get('g') ?? ''),
		invitations: list.pendingInvitationCount
	};
	return json(out, { headers: { 'cache-control': 'private, no-store' } });
};
