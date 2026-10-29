import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { boardReturnTo, pathEscape, withNotice } from '#lib/features/social/boards/boards.js';
import {
	boardsFailure,
	deleteBoardPost,
	formValue,
	getBoardPost,
	methodNotAllowed
} from '#lib/features/social/boards/boards.server.js';

// POST /boards/p/{id}/delete (handlers.BoardsDeletePost). Also posted to by
// /admin/community with return_to. POST-only, as in Go.
export const load: PageServerLoad = () => methodNotAllowed();

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const id = event.params.id;
		let fallback = '/boards';
		try {
			const detail = await getBoardPost(event, id);
			fallback = '/boards/' + pathEscape(detail.post.boardSlug);
		} catch {
			/* keep /boards */
		}
		try {
			await deleteBoardPost(event, id);
		} catch (err) {
			boardsFailure(err, 'post');
		}
		redirect(303, withNotice(boardReturnTo(formValue(data, 'return_to'), fallback), 'deleted'));
	}
};
