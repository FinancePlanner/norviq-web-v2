import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { boardReturnTo, pathEscape, withNotice } from '#lib/features/social/boards/boards.js';
import {
	boardsFailure,
	deleteBoardComment,
	formValue,
	methodNotAllowed
} from '#lib/features/social/boards/boards.server.js';

// POST /boards/c/{id}/delete (handlers.BoardsDeleteComment). Also posted to by
// /admin/community with return_to. POST-only, as in Go.
export const load: PageServerLoad = () => methodNotAllowed();

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const postID = formValue(data, 'post_id');
		try {
			await deleteBoardComment(event, event.params.id);
		} catch (err) {
			boardsFailure(err, 'comment');
		}
		const fallback = postID !== '' ? '/boards/p/' + pathEscape(postID) : '/boards';
		redirect(303, withNotice(boardReturnTo(formValue(data, 'return_to'), fallback), 'deleted'));
	}
};
