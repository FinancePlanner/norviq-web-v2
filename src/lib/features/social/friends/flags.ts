import type { SocialConfig } from '#lib/nav.js';

// Client-safe copies of the social.Config predicates (gates.server.ts holds
// the same ones server-side, but is server-only). page.data.social carries
// every key the backend returns, including achievements/activityFeed.
export type SocialFlags = SocialConfig & { achievements?: boolean; activityFeed?: boolean };

export const leaderboardsOn = (c: SocialFlags | null | undefined) => !!c?.enabled && !!c.leaderboards;
export const achievementsOn = (c: SocialFlags | null | undefined) => !!c?.enabled && !!c.achievements;
export const activityFeedOn = (c: SocialFlags | null | undefined) => achievementsOn(c) && !!c?.activityFeed;
