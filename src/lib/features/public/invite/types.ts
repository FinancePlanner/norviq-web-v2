// View models for /i/{code} (pages/public/invite.templ) and /g/{code}
// (pages/public/group_invite.templ). Client-safe: types and pure helpers.

/** api.SocialUserSummary */
export interface SocialUserSummary {
	id: string;
	username: string;
	displayName?: string | null;
	avatarUrl?: string | null;
	friendshipStatus: string;
	mutualFriendCount?: number | null;
}

/** SocialUserSummary.Title: the display name when set, else @username. */
export function socialUserTitle(u: SocialUserSummary): string {
	return u.displayName ? u.displayName : '@' + u.username;
}

export interface InviteVM {
	code: string;
	/** financeplan://invite/{code} */
	appURL: string;
	appStoreURL: string;
	canonicalURL: string;
	ogImageURL: string;
	/** Set only for a signed-in visitor whose invite resolved. */
	inviter: SocialUserSummary | null;
	/** Why a signed-in visitor sees no Accept button. */
	inviteError: string;
	/** Signed-out only. */
	signupURL: string;
	loginURL: string;
}

export interface GroupInviteVM {
	code: string;
	/** financeplan://groups/join/{code} */
	appURL: string;
	appStoreURL: string;
	canonicalURL: string;
	ogImageURL: string;
	groupName: string;
	groupEmoji: string;
	groupTicker: string;
	members: number;
	inviter: string;
	/** Set when the visitor is already in the group. */
	openURL: string;
	inviteError: string;
	signupURL: string;
	loginURL: string;
}
