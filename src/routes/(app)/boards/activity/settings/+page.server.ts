import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	boardsFailure,
	formValue,
	methodNotAllowed,
	updateBoardNotificationSettings
} from '#lib/features/social/boards/boards.server.js';

// POST /boards/activity/settings (handlers.BoardsActivitySettings). POST-only, as in Go.
export const load: PageServerLoad = () => methodNotAllowed();

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		try {
			await updateBoardNotificationSettings(event, {
				replyPush: formValue(data, 'reply_push') === 'true',
				upvotePush: formValue(data, 'upvote_push') === 'true'
			});
		} catch (err) {
			boardsFailure(err, 'settings');
		}
		redirect(303, '/boards/activity?notice=settings');
	}
};
