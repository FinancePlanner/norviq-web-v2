import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { api } from '#lib/server/api.js';
import { parseUUID } from '#lib/features/dashboard/goals/form.server.js';

// POST /notifications/{id}/read → NotificationRead. 404 on a malformed id;
// otherwise the API result is ignored and it always goes back to the inbox.
export const POST: RequestHandler = async (event) => {
	const id = parseUUID(event.params.id);
	if (!id) error(404, 'Not Found');
	await api(event)
		.PUT('/v1/notifications/inbox/{eventID}/read', {
			params: { path: { eventID: id } },
			body: { read: true }
		})
		.catch(() => null);
	redirect(303, '/notifications');
};
