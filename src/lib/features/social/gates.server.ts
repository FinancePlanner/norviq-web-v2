import { error, type RequestEvent } from '@sveltejs/kit';
import { loadSocialConfig } from '#lib/server/app-context.js';
import type { SocialConfig } from '#lib/nav.js';

// Ports of norviq-web internal/middleware/social.go Require* gates and
// internal/social Config helpers. loadSocialConfig spreads every key the
// backend returns, so achievements/activityFeed are present at runtime even
// though the shared SocialConfig type does not name them.

export type SocialFlags = SocialConfig & { achievements?: boolean; activityFeed?: boolean };

export const socialEnabled = (c: SocialFlags) => c.enabled;
export const leaderboardsOn = (c: SocialFlags) => c.enabled && c.leaderboards;
export const groupsOn = (c: SocialFlags) => c.enabled && c.groups;
export const groupsPublicOn = (c: SocialFlags) => groupsOn(c) && c.groupsPublic;
export const xImportOn = (c: SocialFlags) => c.enabled && c.xImport;
export const facebookImportOn = (c: SocialFlags) => c.enabled && c.facebookImport;
export const achievementsOn = (c: SocialFlags) => c.enabled && !!c.achievements;
export const activityFeedOn = (c: SocialFlags) => achievementsOn(c) && !!c.activityFeed;

async function gate(event: RequestEvent, on: (c: SocialFlags) => boolean): Promise<SocialFlags> {
	const cfg = (await loadSocialConfig(event)) as SocialFlags;
	if (!on(cfg)) error(404, 'Not Found');
	return cfg;
}

/** RequireSocial */
export const requireSocial = (e: RequestEvent) => gate(e, socialEnabled);
/** RequireLeaderboards */
export const requireLeaderboards = (e: RequestEvent) => gate(e, leaderboardsOn);
/** RequireGroups */
export const requireGroups = (e: RequestEvent) => gate(e, groupsOn);
/** RequireXImport (inside RequireSocial) */
export const requireXImport = (e: RequestEvent) => gate(e, xImportOn);
/** RequireFacebookImport (inside RequireSocial) */
export const requireFacebookImport = (e: RequestEvent) => gate(e, facebookImportOn);
/** RequireAchievements */
export const requireAchievements = (e: RequestEvent) => gate(e, achievementsOn);
/** RequireActivityFeed */
export const requireActivityFeed = (e: RequestEvent) => gate(e, activityFeedOn);
