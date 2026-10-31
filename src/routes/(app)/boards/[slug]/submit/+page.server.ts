import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	boardCard,
	kindOptions,
	pathEscape,
	queryEscape,
	splitBoardTags,
	type CreateBoardPostRequest
} from '#lib/features/social/boards/boards.js';
import {
	boardsErrorText,
	boardsFailure,
	createBoardPost,
	formValue,
	getBoard,
	isBoardsCode,
	isBoardsNotFound,
	loadBoardsViewer
} from '#lib/features/social/boards/boards.server.js';

// GET /boards/{slug}/submit (handlers.BoardsSubmitForm → renderBoardsSubmit).
// POST (BoardsSubmit) is the default action; a refusal re-renders the form
// with what was typed and the backend's reason (422).
export const load: PageServerLoad = async (event) => {
	const viewer = await loadBoardsViewer(event);
	if (viewer.needsSetup && !viewer.needsUsername) {
		redirect(303, '/boards/guidelines?next=' + queryEscape(event.url.pathname));
	}
	let board;
	try {
		board = await getBoard(event, event.params.slug);
	} catch (err) {
		boardsFailure(err, 'board');
	}
	return { viewer, board: boardCard(board), kindOptions: kindOptions('link') };
};

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const vm = {
			kind: formValue(data, 'kind'),
			title: formValue(data, 'title').trim(),
			url: formValue(data, 'url').trim(),
			body: formValue(data, 'body').trim(),
			tags: formValue(data, 'tags')
		};
		const req: CreateBoardPostRequest = {
			kind: vm.kind,
			title: vm.title,
			url: null,
			body: null,
			tags: splitBoardTags(vm.tags)
		};
		if (vm.kind === 'link' && vm.url !== '') req.url = vm.url;
		if (vm.body !== '') req.body = vm.body;
		if (vm.kind !== 'link' && vm.url !== '') {
			// Treat a URL on a non-link post as a link post with text, which is
			// what someone filling both fields almost always meant.
			req.kind = 'link';
			req.url = vm.url;
		}
		let post;
		try {
			post = await createBoardPost(event, event.params.slug, req);
		} catch (err) {
			if (isBoardsNotFound(err) || isBoardsCode(err, 'community_banned'))
				boardsFailure(err, 'board');
			return fail(422, { error: boardsErrorText(err), ...vm, kindOptions: kindOptions(vm.kind) });
		}
		redirect(303, '/boards/' + pathEscape(post.boardSlug) + '/p/' + pathEscape(post.id));
	}
};
