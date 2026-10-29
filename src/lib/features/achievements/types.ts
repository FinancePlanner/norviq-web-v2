// Port of norviq-web internal/api/achievements.go (the parts the
// /achievements page and the unlock toast read). Hand-written like Go's DTOs:
// copy arrives already localized for the forwarded Accept-Language, and no
// money is ever exposed. The friends-side shapes (showcase entries, feed
// items, AchievementUnlock) live in #lib/features/social/friends/types.js.

export const AchievementState = {
	Earned: 'earned',
	InProgress: 'inProgress',
	Locked: 'locked',
	Hidden: 'hidden'
} as const;

export interface AchievementTier {
	/** bronze, silver, gold, or "" for a single-tier achievement. */
	tier: string;
	/** null / 0 while the achievement is hidden. */
	threshold?: number | null;
	xp: number;
	unlockId?: string | null;
	unlockedAt?: string | null;
	showcaseRank?: number | null;
}

export interface AchievementProgress {
	current: number;
	target: number;
}

export interface Achievement {
	/** An opaque hidden.<n> while state is hidden; never derive anything from it. */
	key: string;
	category: string;
	title: string;
	description: string;
	iconKey: string;
	state: string;
	/** The highest earned tier; empty for an earned single-tier achievement. */
	currentTier?: string | null;
	progress?: AchievementProgress | null;
	isPerformance: boolean;
	tiers?: AchievementTier[] | null;
}

export interface AchievementCategory {
	key: string;
	title: string;
}

export interface AchievementSummary {
	unlocked: number;
	total: number;
	hiddenRemaining: number;
}

export interface AchievementsResponse {
	summary: AchievementSummary;
	categories?: AchievementCategory[] | null;
	achievements?: Achievement[] | null;
}

/** AchievementShowcaseItem: one pinned (key, tier); ranked 1..n in order, at most 3. */
export interface AchievementShowcaseItem {
	key: string;
	tier: string;
}
