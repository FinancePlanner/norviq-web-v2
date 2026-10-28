import { redirect, type RequestHandler } from '@sveltejs/kit';
import { OnboardingKey } from '#lib/server/onboarding.js';

// POST /logout (auth.go Logout): queue the PostHog event, drop the session.
export const POST: RequestHandler = async ({ locals }) => {
	const wasAuthed = locals.session.isAuthenticated;
	await locals.session.destroy();
	if (wasAuthed) await locals.session.set(OnboardingKey.PostHogCaptureEvent, { event: 'user_logged_out' });
	redirect(303, '/login');
};
