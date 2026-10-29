import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { boardReturnTo, withNotice } from '#lib/features/social/boards/boards.js';
import { formValue, methodNotAllowed, reportBoardContent } from '#lib/features/social/boards/boards.server.js';

// POST /boards/report (handlers.BoardsReport). A failed report never errors
// the page: it comes back with ?notice=report_fail.
export const load: PageServerLoad = () => methodNotAllowed();

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const postID = formValue(data, 'post_id') || null;
		const commentID = formValue(data, 'comment_id') || null;
		let notice = 'reported';
		try {
			await reportBoardContent(event, postID, commentID, formValue(data, 'reason'), '');
		} catch (err) {
			console.warn('board report failed', err);
			notice = 'report_fail';
		}
		redirect(303, withNotice(boardReturnTo(formValue(data, 'return_to'), '/boards'), notice));
	}
};
