import { redirect, type RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { withQuery } from '#lib/features/social/groups/view.js';

const inviteLinkCode = /(?:\/g\/)?([A-Za-z0-9]{6,32})\/?$/;

// GroupsJoinLink takes a pasted invite link or bare code and opens /g/{code}.
export const GET: RequestHandler = async (event) => {
	await requireGroups(event);
	const match = inviteLinkCode.exec((event.url.searchParams.get('link') ?? '').trim());
	if (!match)
		redirect(303, withQuery('/groups', 'error', "That doesn't look like a group invite link."));
	redirect(303, '/g/' + match[1]);
};
