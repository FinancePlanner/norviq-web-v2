import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { boardReturnTo, withNotice } from '#lib/features/social/boards/boards.js';
import { acceptCommunityGuidelines, boardsFailure, formValue } from '#lib/features/social/boards/boards.server.js';

// GET /boards/guidelines (handlers.BoardsGuidelines) and POST
// (BoardsGuidelinesAccept, the default action). Go loads no viewer here.
export const load: PageServerLoad = (event) => ({
	next: boardReturnTo(event.url.searchParams.get('next') ?? '', '/boards')
});

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		try {
			await acceptCommunityGuidelines(event);
		} catch (err) {
			boardsFailure(err, 'guidelines');
		}
		redirect(303, withNotice(boardReturnTo(formValue(data, 'next'), '/boards'), 'guidelines'));
	}
};
