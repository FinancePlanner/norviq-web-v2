import { error, json, redirect, text, type RequestHandler } from '@sveltejs/kit';
import { isAPIError } from '#lib/server/api.js';
import { requireGroups } from '#lib/features/social/gates.server.js';
import {
	boardsErrorText,
	groupMessages,
	groupsID,
	GROUPS_PAGE_SIZE,
	rowOptions,
	sendGroupMessage,
	type MessageQuery,
	readForm
} from '#lib/features/social/groups/groups.server.js';
import { buildRows, chatHref } from '#lib/features/social/groups/view.js';
import type { GroupMessage, GroupMessagePage, RowsResponse } from '#lib/features/social/groups/types.js';

// GroupsMessages: the rows (Go: MessageRows fragment, here JSON for
// GroupChat). ?before= pages back for the older sentinel, ?after= catches up
// for the live script. A catch-up asks for one message more than it renders,
// so new rows group with the last one shown.
export const GET: RequestHandler = async (event) => {
	await requireGroups(event);
	groupsID(event.params.groupID);
	const channelID = groupsID(event.params.channelID);
	const before = parseInt(event.url.searchParams.get('before') ?? '', 10) || 0;
	const after = parseInt(event.url.searchParams.get('after') ?? '', 10) || 0;
	let query: MessageQuery = { before, limit: GROUPS_PAGE_SIZE };
	if (after > 0) query = { after: after - 1, limit: 100 };
	let page: GroupMessagePage;
	try {
		page = await groupMessages(event, channelID, query);
	} catch (err) {
		if (isAPIError(err) && err.status === 404) error(404, 'Not Found');
		return text('unavailable', { status: 502 });
	}
	let messages = page.items ?? [];
	let prev: GroupMessage | null = null;
	if (after > 0 && messages.length > 0 && messages[0].seq === after) {
		prev = messages[0];
		messages = messages.slice(1);
	}
	// The page tells the script whether the viewer moderates, so a catch-up
	// costs one backend call. It only decides whether Delete is offered; the
	// backend still refuses anyone who may not.
	const opts = rowOptions(event, event.url.searchParams.get('mod') === '1', 0);
	let olderSeq = 0;
	if (before > 0 && page.hasMoreBefore && messages.length > 0) olderSeq = messages[0].seq;
	const out: RowsResponse = { rows: buildRows(messages, prev, opts), olderSeq };
	// More than one page was missed; the script asks again.
	if (after > 0 && page.hasMoreAfter) out.more = true;
	return json(out, { headers: { 'cache-control': 'private, no-store' } });
};

// GroupsSend posts a message and answers with its row. Refusals are plain
// text, which the chat shows under the pending row. Without the script, a
// plain form post lands back on the channel.
export const POST: RequestHandler = async (event) => {
	await requireGroups(event);
	const groupID = groupsID(event.params.groupID);
	const channelID = groupsID(event.params.channelID);
	const form = await readForm(event);
	const body = String(form.get('body') ?? '').trim();
	let clientID = String(form.get('client_id') ?? '').trim();
	if (clientID === '') clientID = crypto.randomUUID();
	if (body === '') return text('Write something first.', { status: 422 });
	let message: GroupMessage;
	try {
		message = await sendGroupMessage(event, channelID, clientID, body);
	} catch (err) {
		if (isAPIError(err) && err.status === 429) return text("You're sending messages too fast. Wait a moment.", { status: 429 });
		if (isAPIError(err) && err.status >= 400 && err.status < 500) return text(boardsErrorText(err), { status: err.status });
		console.error('group message send failed', err);
		return text("Couldn't send. Try again.", { status: 502 });
	}
	if (!event.request.headers.get('X-Groups-Send')) {
		redirect(303, chatHref(groupID, channelID) + '#msg-' + message.seq);
	}
	const rows = buildRows([message], null, rowOptions(event, false, 0));
	// The chat places the row after what is already on screen.
	if (rows.length > 0) rows[0].dayLabel = '';
	return json({ rows, olderSeq: 0 } satisfies RowsResponse);
};
