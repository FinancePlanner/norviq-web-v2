import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	boardCard,
	boardNotice,
	boardPostRow,
	pathEscape,
	queryEscape
} from '#lib/features/social/boards/boards.js';
import {
	boardUnreadCount,
	boardsErrorText,
	boardsFailure,
	createBoard,
	formValue,
	isBoardsCode,
	listBoards,
	loadBoardsViewer
} from '#lib/features/social/boards/boards.server.js';

// GET /boards (handlers.BoardsDirectory → renderBoardsDirectory). POST /boards
// (BoardsCreate) is the default action: a refusal re-renders the directory
// with the form and the backend's reason (422), a ban the banned page.
export const load: PageServerLoad = async (event) => {
	const viewer = await loadBoardsViewer(event);
	let list;
	try {
		list = await listBoards(event, event.url.searchParams.get('cursor') ?? '');
	} catch (err) {
		boardsFailure(err, 'boards');
	}
	// Best effort: a missing count only hides the badge.
	let unread = 0;
	try {
		unread = await boardUnreadCount(event);
	} catch {
		/* hide the badge */
	}
	const now = new Date();
	return {
		viewer,
		unread,
		notice: boardNotice(event.url.searchParams.get('notice')),
		daily: list.dailyPost ? boardPostRow(list.dailyPost, viewer, now) : null,
		boards: (list.items ?? []).map((b) => boardCard(b, now)),
		next: list.nextCursor != null ? queryEscape(list.nextCursor) : ''
	};
};

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const form = {
			slug: formValue(data, 'slug').trim(),
			name: formValue(data, 'name').trim(),
			description: formValue(data, 'description').trim()
		};
		let board;
		try {
			board = await createBoard(event, form);
		} catch (err) {
			if (isBoardsCode(err, 'community_banned')) boardsFailure(err, 'boards');
			return fail(422, { error: boardsErrorText(err), form });
		}
		redirect(303, '/boards/' + pathEscape(board.slug));
	}
};
