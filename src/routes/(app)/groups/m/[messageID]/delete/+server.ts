import { json, redirect, text, type RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import {
	boardsErrorText,
	deleteGroupMessage,
	groupsID,
	groupsRedirectError,
	refererGroupsPath
} from '#lib/features/social/groups/groups.server.js';

// GroupsDeleteMessage tombstones a message. The chat posts it with fetch
// (Go: hx-post swapping in the tombstone row); a plain form post redirects
// back to the page it came from.
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const messageID = groupsID(event.params.messageID);
	const scripted = !!event.request.headers.get('X-Groups-Fetch');
	try {
		await deleteGroupMessage(event, messageID);
	} catch (err) {
		if (scripted) return text(boardsErrorText(err), { status: 422 });
		groupsRedirectError(err, refererGroupsPath(event), event.url.pathname);
	}
	if (!scripted) redirect(303, refererGroupsPath(event));
	return json({ deleted: true });
};
