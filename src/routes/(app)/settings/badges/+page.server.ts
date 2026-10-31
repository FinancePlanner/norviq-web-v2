import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadSocialConfig } from '#lib/server/app-context.js';
import { achievementsOn } from '#lib/features/social/gates.server.js';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import { errorStatus } from '#lib/features/settings-admin/api-errors.js';

type BadgesListResponse = components['schemas']['BadgesListResponse'];
type BadgeProgress = BadgesListResponse['badges'][number];

interface BadgeCardVM {
	title: string;
	description: string;
	tierLabel: string;
	progressPct: number;
	progressText: string;
	unlocked: boolean;
}

function titleCase(raw: string): string {
	const s = raw.trim();
	return s === '' ? s : s[0].toUpperCase() + s.slice(1).toLowerCase();
}

function mapBadgeCard(badge: BadgeProgress): BadgeCardVM {
	const unlocked = badge.currentTier !== undefined && badge.currentTier !== null;
	let tier = 'Locked';
	if (unlocked) tier = titleCase(String(badge.currentTier));
	else if (badge.nextTier) tier = 'Next: ' + titleCase(String(badge.nextTier));
	return {
		title: badge.title,
		description: badge.description,
		tierLabel: tier,
		progressPct: Math.min(100, Math.max(0, badge.progress * 100)),
		progressText: badge.targetCount > 0 ? `${badge.currentCount} / ${badge.targetCount}` : '',
		unlocked
	};
}

// Go LoadBadgesVM. Achievements replace the badge grid while the backend has
// them on (handlers.Settings "badges" → 302 /achievements).
export const load: PageServerLoad = async (event) => {
	if (achievementsOn(await loadSocialConfig(event))) redirect(302, '/achievements');
	try {
		const payload = await apiJSON<BadgesListResponse>(event, 'GET', '/v1/badges');
		return {
			vm: {
				hasLoadError: false,
				errorMessage: '',
				earnedTiers: payload.totalEarnedTiers,
				totalTiers: payload.totalAvailableTiers,
				progressPct:
					payload.totalAvailableTiers > 0
						? (payload.totalEarnedTiers / payload.totalAvailableTiers) * 100
						: 0,
				badges: (payload.badges ?? []).map(mapBadgeCard)
			}
		};
	} catch (err) {
		console.warn('badges fetch failed', errorStatus(err), err);
		return {
			vm: {
				hasLoadError: true,
				errorMessage: 'Could not load badges right now.',
				earnedTiers: 0,
				totalTiers: 0,
				progressPct: 0,
				badges: [] as BadgeCardVM[]
			}
		};
	}
};
