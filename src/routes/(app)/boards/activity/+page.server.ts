import type { PageServerLoad } from './$types';
import {
	boardAge,
	boardNotice,
	pathEscape,
	queryEscape,
	type ActivityRow
} from '#lib/features/social/boards/boards.js';
import {
	boardNotificationSettings,
	boardsFailure,
	listBoardNotifications,
	loadBoardsViewer,
	markBoardNotificationsRead
} from '#lib/features/social/boards/boards.server.js';

// GET /boards/activity (handlers.BoardsActivity): the viewer's replies and
// upvotes. What was unread is highlighted on this visit, then everything is
// marked read.
export const load: PageServerLoad = async (event) => {
	await loadBoardsViewer(event);
	let page;
	try {
		page = await listBoardNotifications(event, event.url.searchParams.get('cursor') ?? '');
	} catch (err) {
		boardsFailure(err, 'activity');
	}
	let replyPush = true;
	let upvotePush = true;
	try {
		const settings = await boardNotificationSettings(event);
		replyPush = settings.replyPush;
		upvotePush = settings.upvotePush;
	} catch {
		/* defaults: both on */
	}
	const now = new Date();
	const rows: ActivityRow[] = (page.items ?? []).map((n) => {
		let link = '/boards/' + pathEscape(n.boardSlug) + '/p/' + pathEscape(n.postId);
		if (n.commentId != null) link += '#c-' + pathEscape(n.commentId);
		return {
			kind: n.kind,
			actor: n.actorUsername ?? 'Someone',
			title: n.postTitle,
			excerpt: n.excerpt ?? '',
			link,
			age: boardAge(new Date(n.createdAt), now),
			unread: !n.isRead
		};
	});
	if (page.unreadCount > 0) {
		try {
			await markBoardNotificationsRead(event, null);
		} catch (err) {
			console.warn('board notifications mark read failed', err);
		}
	}
	return {
		notice: boardNotice(event.url.searchParams.get('notice')),
		rows,
		next: page.nextCursor != null ? queryEscape(page.nextCursor) : '',
		replyPush,
		upvotePush
	};
};
