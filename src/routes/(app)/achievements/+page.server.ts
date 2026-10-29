import type { PageServerLoad } from './$types';
import { requireAchievements } from '#lib/features/social/gates.server.js';
import { achievementsDo } from '#lib/features/achievements/achievements.server.js';
import type { AchievementsResponse } from '#lib/features/achievements/types.js';
import { buildPage, type PageViewModel } from '#lib/features/achievements/viewmodel.js';

// Port of handlers.Achievements: every achievement by category, with the
// member's pinned showcase first. 404 unless the backend has achievements on.
export const load: PageServerLoad = async (event) => {
	await requireAchievements(event);
	const query = event.url.searchParams;
	let vm: PageViewModel;
	try {
		vm = buildPage(await achievementsDo<AchievementsResponse>(event, 'GET', '/v1/achievements'));
	} catch (err) {
		console.warn('achievements fetch failed', err);
		vm = {
			notice: '',
			errorMessage: '',
			loadFailed: true,
			summary: { unlocked: 0, total: 0, hiddenRemaining: 0 },
			showcase: [],
			sections: []
		};
	}
	vm.notice = query.get('notice') ?? '';
	vm.errorMessage = query.get('error') ?? '';
	return { vm };
};
