import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { pathEscape } from '#lib/features/social/boards/boards.js';
import {
	boardsErrorText,
	boardsFailure,
	createBoardComment,
	formValue,
	isBoardsCode,
	isBoardsNotFound,
	loadPostPage,
	methodNotAllowed
} from '#lib/features/social/boards/boards.server.js';

// POST /boards/p/{id}/comments (handlers.BoardsComment). A refusal re-renders
// the post page at this URL with a 422, as Go did; a GET is a 405. The
// enhanced forms on the post page apply the failure in place instead.
export const load: PageServerLoad = (event) => {
	if (event.request.method !== 'POST') methodNotAllowed();
	return loadPostPage(event, event.params.id);
};

export const actions: Actions = {
	default: async (event) => {
		const id = event.params.id;
		const data = await event.request.formData();
		const raw = formValue(data, 'parent_id').trim();
		let comment;
		try {
			comment = await createBoardComment(event, id, raw !== '' ? raw : null, formValue(data, 'body'));
		} catch (err) {
			if (isBoardsNotFound(err) || isBoardsCode(err, 'community_banned')) boardsFailure(err, 'post');
			return fail(422, { error: boardsErrorText(err) });
		}
		// boardPostPath: no slug in this route, so the generic post path.
		redirect(303, '/boards/p/' + pathEscape(id) + '#c-' + pathEscape(comment.id));
	}
};
