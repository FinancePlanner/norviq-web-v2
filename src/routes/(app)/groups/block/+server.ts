import { redirect, type RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import {
	blockCommunityUser,
	groupsRedirectError,
	groupsReturnTo,
	readForm
} from '#lib/features/social/groups/groups.server.js';
import { withNotice } from '#lib/features/social/groups/view.js';

// GroupsBlock blocks a message's author, the same community block Boards
// uses, and returns to the channel.
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const form = await readForm(event);
	const back = groupsReturnTo(String(form.get('return_to') ?? ''));
	try {
		await blockCommunityUser(event, String(form.get('username') ?? ''));
	} catch (err) {
		groupsRedirectError(err, back, event.url.pathname);
	}
	redirect(303, withNotice(back, 'blocked'));
};
