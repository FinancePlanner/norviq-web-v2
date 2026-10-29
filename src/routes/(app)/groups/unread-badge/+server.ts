import { json, type RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { groupUnreadCount } from '#lib/features/social/groups/groups.server.js';

// GroupsUnreadBadge: the sidebar count beside "Your groups", unread messages
// plus pending invitations. NavBadge expects JSON {count}; Go rendered an
// HTML fragment. Failures count as zero (Go rendered nothing).
export const GET: RequestHandler = async (event) => {
	await requireGroups(event);
	let count = 0;
	try {
		const c = await groupUnreadCount(event);
		count = (c.total ?? 0) + (c.pendingInvitationCount ?? 0);
	} catch {
		count = 0;
	}
	return json({ count }, { headers: { 'cache-control': 'private, no-store' } });
};
