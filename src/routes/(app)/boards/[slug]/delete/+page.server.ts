import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { adminDeleteBoard, boardsFailure, methodNotAllowed } from '#lib/features/social/boards/boards.server.js';

// POST /boards/{slug}/delete (handlers.BoardsDeleteBoard). POST-only, as in Go.
export const load: PageServerLoad = () => methodNotAllowed();

export const actions: Actions = {
	default: async (event) => {
		try {
			await adminDeleteBoard(event, event.params.slug);
		} catch (err) {
			boardsFailure(err, 'board');
		}
		redirect(303, '/boards?notice=board');
	}
};
