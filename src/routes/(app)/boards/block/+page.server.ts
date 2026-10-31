import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { boardReturnTo, withNotice } from '#lib/features/social/boards/boards.js';
import {
	blockCommunityUser,
	boardsFailure,
	formValue,
	methodNotAllowed
} from '#lib/features/social/boards/boards.server.js';

// POST /boards/block (handlers.BoardsBlock). POST-only, as in Go.
export const load: PageServerLoad = () => methodNotAllowed();

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		try {
			await blockCommunityUser(event, formValue(data, 'username'));
		} catch (err) {
			boardsFailure(err, 'user');
		}
		redirect(303, withNotice(boardReturnTo(formValue(data, 'return_to'), '/boards'), 'blocked'));
	}
};
