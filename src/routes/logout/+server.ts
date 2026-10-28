import { redirect, type RequestHandler } from '@sveltejs/kit';
import { setPostHogCaptureOnce } from '#lib/analytics/runtime.server.js';

// POST /logout (auth.go Logout): queue the PostHog event, drop the session.
export const POST: RequestHandler = async ({ locals }) => {
	const wasAuthed = locals.session.isAuthenticated;
	await locals.session.destroy();
	if (wasAuthed) await setPostHogCaptureOnce(locals, 'user_logged_out');
	redirect(303, '/login');
};
