import type { RequestEvent } from '@sveltejs/kit';
import { isAPIError } from '#lib/server/api.js';
import { achievementsDo, socialErrorMessage } from '#lib/features/social/friends/friends.server.js';
import type { AchievementUnlock } from '#lib/features/social/friends/types.js';
import type { AchievementShowcaseItem } from './types.js';
import { buildToast, ItemSep, type ToastViewModel } from './viewmodel.js';

// Ports of norviq-web internal/handlers/achievements.go helpers. Backend calls
// go through achievementsDo (socialDo + Accept-Language).

export { achievementsDo };

/**
 * Parse the showcase form: each "item" is "key|tier". null for a malformed or
 * hidden.<n> item (Go answers 400 Bad request).
 */
export function parseShowcaseItems(raw: FormDataEntryValue[]): AchievementShowcaseItem[] | null {
	const items: AchievementShowcaseItem[] = [];
	for (const entry of raw) {
		const value = String(entry);
		const i = value.indexOf(ItemSep);
		if (i < 0) return null;
		const key = value.slice(0, i);
		const tier = value.slice(i + ItemSep.length);
		if (key === '' || tier.includes(ItemSep) || key.startsWith('hidden.')) return null;
		items.push({ key, tier });
	}
	return items;
}

/** showcaseErrorMessage */
export function showcaseErrorMessage(err: unknown): string {
	if (isAPIError(err) && err.status === 400) return 'You can pin up to 3 achievements';
	return socialErrorMessage(err, 'Could not update your showcase right now.');
}

/**
 * AchievementsUnseen: unlocks are marked seen before anything renders, so a
 * failure to mark them renders nothing rather than a toast that would repeat
 * on every page load. null = no toast.
 */
export async function loadUnseenToast(event: RequestEvent): Promise<ToastViewModel | null> {
	let unlocks: AchievementUnlock[] = [];
	try {
		unlocks =
			(await achievementsDo<AchievementUnlock[] | null>(event, 'GET', '/v1/achievements/unseen')) ??
			[];
	} catch (err) {
		console.warn('achievements unseen failed', err);
		unlocks = [];
	}
	if (unlocks.length > 0) {
		try {
			await achievementsDo(event, 'POST', '/v1/achievements/seen', {
				ids: unlocks.map((u) => u.id)
			});
		} catch (err) {
			console.warn('achievements mark seen failed', err);
			unlocks = [];
		}
	}
	return unlocks.length === 0 ? null : buildToast(unlocks);
}
