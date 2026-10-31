import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAchievements } from '#lib/features/social/gates.server.js';
import { redirectWith } from '#lib/features/settings-admin/social/social.server.js';
import {
	achievementsDo,
	parseShowcaseItems,
	showcaseErrorMessage
} from '#lib/features/achievements/achievements.server.js';

// POST /achievements/showcase — handlers.AchievementsShowcase. The form
// carries the full desired list, so a pin appends and an unpin omits without
// a second read. Redirects back to /achievements with a flash either way.
export const POST: RequestHandler = async (event) => {
	await requireAchievements(event);
	let form: FormData;
	try {
		form = await event.request.formData();
	} catch {
		error(400, 'Bad request');
	}
	const items = parseShowcaseItems(form.getAll('item'));
	if (!items) error(400, 'Bad request');
	try {
		await achievementsDo(event, 'PUT', '/v1/achievements/showcase', { items });
	} catch (err) {
		console.warn('achievements showcase failed', err);
		redirectWith('/achievements', '', showcaseErrorMessage(err));
	}
	redirectWith('/achievements', 'Showcase updated.', '');
};
