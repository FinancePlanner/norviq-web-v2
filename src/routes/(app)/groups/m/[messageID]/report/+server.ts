import { json, text, type RequestHandler } from '@sveltejs/kit';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { groupsID, reportGroupMessage, readForm } from '#lib/features/social/groups/groups.server.js';

// GroupsReportMessage. The chat posts it with fetch and swaps the form for
// "Thanks…" (Go: hx-post answering with the Reported fragment, which a plain
// form post also got as the whole page).
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const messageID = groupsID(event.params.messageID);
	const form = await readForm(event);
	try {
		await reportGroupMessage(event, messageID, String(form.get('reason') ?? ''));
	} catch (err) {
		console.warn('group message report failed', err);
		return text("That report didn't go through. Try again.", { status: 502 });
	}
	if (event.request.headers.get('X-Groups-Fetch')) return json({ reported: true });
	return new Response('<p class="p-2 text-xs text-muted-foreground" role="status">Thanks. A person will review it.</p>', {
		headers: { 'content-type': 'text/html; charset=utf-8' }
	});
};
