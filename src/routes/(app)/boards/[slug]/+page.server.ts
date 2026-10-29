import type { PageServerLoad } from './$types';
import { boardCard, boardNotice, boardPostRow, queryEscape, stripNotice } from '#lib/features/social/boards/boards.js';
import { boardsFailure, getBoard, listBoardPosts, loadBoardsViewer } from '#lib/features/social/boards/boards.server.js';

// GET /boards/{slug} (handlers.BoardsBoard): the board's posts with sort, kind
// and tag filters.
export const load: PageServerLoad = async (event) => {
	const viewer = await loadBoardsViewer(event);
	const slug = event.params.slug;
	let board;
	try {
		board = await getBoard(event, slug);
	} catch (err) {
		boardsFailure(err, 'board');
	}
	const query = event.url.searchParams;
	let sort = query.get('sort') ?? '';
	if (sort !== 'top' && sort !== 'active') sort = 'new';
	let kind = query.get('kind') ?? '';
	if (kind !== 'ask' && kind !== 'show') kind = '';
	const tag = (query.get('tag') ?? '').trim().toLowerCase();
	let page;
	try {
		page = await listBoardPosts(event, slug, { sort, kind, tag, cursor: query.get('cursor') ?? '' });
	} catch (err) {
		boardsFailure(err, 'board');
	}
	const now = new Date();
	return {
		viewer,
		board: boardCard(board, now),
		sort,
		kind,
		tag,
		notice: boardNotice(query.get('notice')),
		backURL: event.url.pathname + '?' + stripNotice(query),
		posts: (page.items ?? []).map((p) => boardPostRow(p, viewer, now)),
		next: page.nextCursor != null ? queryEscape(page.nextCursor) : ''
	};
};
