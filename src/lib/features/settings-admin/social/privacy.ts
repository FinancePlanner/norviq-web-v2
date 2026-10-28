import { leaderboardsOn, type SocialConfig } from '#lib/nav.js';

// Port of norviq-web internal/pages/settings/social_viewmodel.go and the
// social types it reads from internal/api/social.go.

export const SearchVisibility = {
	Everyone: 'everyone',
	FriendsOfFriends: 'friends_of_friends',
	Nobody: 'nobody'
} as const;

export interface SocialPrivacySettings {
	searchVisibility: string;
	discoverableByContacts: boolean;
	discoverableByX: boolean;
	discoverableByFacebook: boolean;
	showReturnPercent: boolean;
	showStreaks: boolean;
	showXP: boolean;
	leaderboardOptIn: boolean;
}

export const emptyPrivacySettings: SocialPrivacySettings = {
	searchVisibility: '',
	discoverableByContacts: false,
	discoverableByX: false,
	discoverableByFacebook: false,
	showReturnPercent: false,
	showStreaks: false,
	showXP: false,
	leaderboardOptIn: false
};

/** Keep only the fields Go's SocialPrivacySettings struct carries (what it PUTs back). */
export function privacySettingsFrom(raw: Partial<SocialPrivacySettings> | null | undefined): SocialPrivacySettings {
	const out = { ...emptyPrivacySettings };
	if (!raw) return out;
	out.searchVisibility = typeof raw.searchVisibility === 'string' ? raw.searchVisibility : '';
	for (const key of Object.keys(emptyPrivacySettings) as (keyof SocialPrivacySettings)[]) {
		if (key !== 'searchVisibility') (out[key] as boolean) = !!raw[key];
	}
	return out;
}

export interface SocialUserSummary {
	id: string;
	username: string;
	displayName?: string | null;
	avatarUrl?: string | null;
	friendshipStatus: string;
	mutualFriendCount?: number | null;
}

/** SocialUserSummary.Title: the display name when set, else @username. */
export function userTitle(u: SocialUserSummary): string {
	return u.displayName ? u.displayName : '@' + u.username;
}

export type PrivacyKey = Exclude<keyof SocialPrivacySettings, 'searchVisibility'>;

export interface PrivacyToggle {
	key: PrivacyKey;
	label: string;
	description?: string;
}

/**
 * PrivacyToggles: the switches this deployment can honor. The submit writes
 * only these fields back, so a hidden switch keeps whatever the user set on iOS.
 * Like Go, the contacts/X/Facebook switches read the raw flags.
 */
export function privacyToggles(cfg: SocialConfig): PrivacyToggle[] {
	const toggles: PrivacyToggle[] = [
		{ key: 'showStreaks', label: 'Show my streaks' },
		{ key: 'showXP', label: 'Show my XP and level' },
		{ key: 'showReturnPercent', label: 'Show my return %', description: 'Off by default. Friends see a percentage, never an amount.' }
	];
	if (leaderboardsOn(cfg)) toggles.push({ key: 'leaderboardOptIn', label: "Appear on friends' leaderboards" });
	if (cfg.contactsDiscovery) {
		toggles.push({
			key: 'discoverableByContacts',
			label: 'Find me from contacts',
			description: 'People who have your email or phone number in their address book (iOS app).'
		});
	}
	if (cfg.xImport) toggles.push({ key: 'discoverableByX', label: 'Find me from X', description: 'People who follow you on X.' });
	if (cfg.facebookImport) {
		toggles.push({
			key: 'discoverableByFacebook',
			label: 'Find me from Facebook',
			description: 'Facebook friends who also connected Facebook to Norviq.'
		});
	}
	return toggles;
}

export function searchVisibilityOptions(current: string) {
	return [
		{ value: SearchVisibility.Everyone, label: 'Everyone', selected: current === SearchVisibility.Everyone },
		{ value: SearchVisibility.FriendsOfFriends, label: 'Friends of friends', selected: current === SearchVisibility.FriendsOfFriends },
		{ value: SearchVisibility.Nobody, label: 'Nobody', selected: current === SearchVisibility.Nobody }
	];
}

/** formChoice(value, allowed...): value when allowed, else the first allowed. */
export function formChoice(value: string, ...allowed: string[]): string {
	return allowed.includes(value) ? value : allowed[0];
}
