import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { api } from '#lib/server/api.js';

// POST /notifications/read-all → NotificationsReadAll. The Go handler ignores
// the API result and always goes back to the inbox.
export const POST: RequestHandler = async (event) => {
	await api(event)
		.POST('/v1/notifications/inbox/read-all')
		.catch(() => null);
	redirect(303, '/notifications');
};
