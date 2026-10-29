// Client-safe ports of norviq-web internal/api/social.go + achievements.go
// wire types and internal/pages/friends/viewmodel.go helpers. Every value is
// a count, a level or a percentage; nothing here carries a money amount.
import type { SocialUserSummary } from '#lib/features/settings-admin/social/privacy.js';

export type { SocialUserSummary };
export { userTitle } from '#lib/features/settings-admin/social/privacy.js';

export const Friendship = {
	None: 'none',
	OutgoingPending: 'outgoing_pending',
	IncomingPending: 'incoming_pending',
	Friends: 'friends',
	Blocked: 'blocked'
} as const;

/** SocialUserSummary.Status: an unknown value from a newer backend reads as "none". */
export function userStatus(u: Pick<SocialUserSummary, 'friendshipStatus'>): string {
	switch (u.friendshipStatus) {
		case Friendship.OutgoingPending:
		case Friendship.IncomingPending:
		case Friendship.Friends:
		case Friendship.Blocked:
			return u.friendshipStatus;
		default:
			return Friendship.None;
	}
}

export interface AchievementShowcaseEntry {
	key: string;
	tier: string;
	title: string;
	iconKey: string;
}

export interface SocialProfile {
	user: SocialUserSummary;
	streakDays?: number | null;
	xpLevel?: number | null;
	badgeCount?: number | null;
	joinedAt?: string | null;
	showcase?: AchievementShowcaseEntry[] | null;
}

export interface SocialFriendRequest {
	id: string;
	from: SocialUserSummary;
	to: SocialUserSummary;
	createdAt: string;
}

export interface SocialFriendRequests {
	incoming: SocialFriendRequest[];
	outgoing: SocialFriendRequest[];
}

export interface SocialFriendsList {
	friends?: SocialUserSummary[] | null;
	nextCursor?: string | null;
}

export interface SocialUserSearch {
	users?: SocialUserSummary[] | null;
	nextCursor?: string | null;
}

export interface SocialInviteLink {
	code: string;
	url: string;
	expiresAt?: string | null;
}

export interface SocialInviteRedeem {
	inviter: SocialUserSummary;
}

/** api.SocialReportReasons, in display order. */
export const SocialReportReasons = ['spam', 'harassment', 'hate', 'scam', 'impersonation', 'inappropriate', 'other'];

export interface SocialXImportStartResponse {
	flowId: string;
	authorizationURL: string;
	expiresIn: number;
}

export interface SocialXImportMatches {
	matches?: { xHandle: string; user: SocialUserSummary }[] | null;
	totalFollowingScanned: number;
}

export interface SocialFacebookImportMatches {
	matches?: { user: SocialUserSummary }[] | null;
	friendsGranted: number;
}

export interface XPSummary {
	total: number;
	level: number;
	/** Share of the way from level to the next, 0–1. */
	levelProgress: number;
	weekXP: number;
}

export interface XPEvent {
	id: string;
	type: string;
	points: number;
	createdAt: string;
}

export interface XPHistory {
	events?: XPEvent[] | null;
	nextCursor?: string | null;
}

export interface StreakSummary {
	checkInCurrent: number;
	checkInLongest: number;
	budgetMonths: number;
	lastCheckInDate?: string | null;
}

export interface CheckInResponse {
	streak: number;
	xpAwarded: number;
	alreadyCheckedIn: boolean;
}

export const Leaderboard = {
	ReturnPercent: 'return_percent',
	XP: 'xp',
	CheckInStreak: 'check_in_streak',
	BudgetStreak: 'budget_streak',
	Week: 'week',
	Month: 'month'
} as const;

export interface LeaderboardEntry {
	rank: number;
	user: SocialUserSummary;
	/** A percent (4.2 means +4.2%) for return_percent, otherwise a count. */
	value: number;
	isMe: boolean;
}

export interface LeaderboardBoard {
	metric: string;
	period: string;
	entries?: LeaderboardEntry[] | null;
	periodStart: string;
	periodEnd: string;
}

export interface AchievementUnlock {
	id: string;
	key: string;
	tier: string;
	title: string;
	description: string;
	iconKey: string;
	xp: number;
	unlockedAt: string;
}

export interface SocialFeedItem {
	id: string;
	actor: SocialUserSummary;
	achievement: { key: string; tier: string; title: string; iconKey: string };
	createdAt: string;
	congratsCount: number;
	viewerCongratulated: boolean;
}

export interface SocialFeedResponse {
	items?: SocialFeedItem[] | null;
	nextCursor?: string | null;
}

/** friends.XPCardViewModel, as /xp/card returns it to XPCardShell. */
export interface XPCardVM {
	xp: XPSummary | null;
	streaks: StreakSummary | null;
	/** The viewer's calendar date (YYYY-MM-DD) in their own zone. */
	today: string;
	errorMessage: string;
}

/** friends.SearchViewModel, as /friends/search returns it. */
export interface SearchVM {
	query: string;
	users: SocialUserSummary[];
	errorMessage: string;
}

/** friends.CongratsVM: one feed row's cheer button. */
export interface CongratsVM {
	id: string;
	count: number;
	done: boolean;
	gone?: boolean;
	errorMessage?: string;
}

// ---- viewmodel.go helpers ----

export function checkedInToday(vm: Pick<XPCardVM, 'today' | 'streaks'>): boolean {
	return !!vm.today && !!vm.streaks?.lastCheckInDate && vm.streaks.lastCheckInDate.startsWith(vm.today);
}

export function feedPath(cursor: string): string {
	return cursor ? '/friends/feed?' + new URLSearchParams({ cursor }).toString() : '/friends/feed';
}

export function xpHistoryPath(cursor: string): string {
	return cursor ? '/xp?' + new URLSearchParams({ cursor }).toString() : '/xp';
}

export const LeaderboardMetrics = [Leaderboard.XP, Leaderboard.CheckInStreak, Leaderboard.BudgetStreak, Leaderboard.ReturnPercent];
export const LeaderboardPeriods = [Leaderboard.Week, Leaderboard.Month];

export function metricLabel(metric: string): string {
	switch (metric) {
		case Leaderboard.ReturnPercent:
			return 'Return %';
		case Leaderboard.CheckInStreak:
			return 'Streak';
		case Leaderboard.BudgetStreak:
			return 'Budget';
		default:
			return 'XP';
	}
}

export function periodLabel(period: string): string {
	return period === Leaderboard.Month ? 'This month' : 'This week';
}

export function leaderboardPath(metric: string, period: string): string {
	return '/friends/leaderboard?metric=' + metric + '&period=' + period;
}

/** Go math.Round: half away from zero. */
const goRound = (v: number) => Math.sign(v) * Math.round(Math.abs(v));

/** LeaderboardValue: Return % signed with one decimal; everything else a whole count with its unit. */
export function leaderboardValue(metric: string, value: number): string {
	switch (metric) {
		case Leaderboard.ReturnPercent:
			return (value >= 0 ? '+' : '') + value.toFixed(1) + '%';
		case Leaderboard.CheckInStreak:
			return count(goRound(value), 'day', 'days');
		case Leaderboard.BudgetStreak:
			return count(goRound(value), 'month', 'months');
		default:
			return `${goRound(value)} XP`;
	}
}

/** valueSentiment: only return % is coloured. */
export function valueSentiment(metric: string, value: number): '' | 'positive' | 'negative' {
	if (metric !== Leaderboard.ReturnPercent) return '';
	if (value > 0) return 'positive';
	if (value < 0) return 'negative';
	return '';
}

/** hasFriends: a board holding only the viewer is the empty state. */
export function hasFriends(board: LeaderboardBoard | null): boolean {
	return !!board?.entries?.some((e) => !e.isMe);
}

export function xpEventLabel(type: string): string {
	switch (type) {
		case 'check_in':
			return 'Daily check-in';
		case 'streak_milestone':
			return 'Streak milestone';
		case 'badge_earned':
			return 'Badge earned';
		case 'expense_logged':
			return 'Expense logged';
		case 'budget_streak_month':
			return 'Month on budget';
		default:
			return 'XP';
	}
}

export function reportReasonLabel(reason: string): string {
	switch (reason) {
		case 'spam':
			return 'Spam';
		case 'harassment':
			return 'Harassment or bullying';
		case 'hate':
			return 'Hate speech';
		case 'scam':
			return 'Scam or fraud';
		case 'impersonation':
			return 'Impersonation';
		case 'inappropriate':
			return 'Inappropriate content';
		default:
			return 'Something else';
	}
}

/** achievements.TierLabel (English id; translate with t()). Single-tier unlocks have none. */
export function tierLabelID(tier: string): string {
	switch (tier) {
		case 'bronze':
			return 'Bronze';
		case 'silver':
			return 'Silver';
		case 'gold':
			return 'Gold';
		default:
			return tier;
	}
}

/** Initials: the avatar disc. Remote avatars are not loaded (CSP). */
export function initials(u: SocialUserSummary): string {
	const source = u.displayName && u.displayName.trim() !== '' ? u.displayName : u.username;
	const out: string[] = [];
	for (const word of source.split(/\s+/).filter(Boolean)) {
		out.push(Array.from(word)[0]);
		if (out.length === 2) break;
	}
	return out.length ? out.join('').toUpperCase() : '?';
}

/** ProgressPercent: 0–1 clamped, "%.0f%%". */
export function progressPercent(progress: number): string {
	return `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`;
}

export const progressValue = (progress: number) => progressPercent(progress).replace(/%$/, '');

export function mutualFriends(u: SocialUserSummary): string {
	if (!u.mutualFriendCount) return '';
	return count(u.mutualFriendCount, 'mutual friend', 'mutual friends');
}

/** rowSubtitle: @username under a display name, plus the mutual-friend count. */
export function rowSubtitle(u: SocialUserSummary): string {
	const parts: string[] = [];
	if (u.displayName) parts.push('@' + u.username);
	const mutual = mutualFriends(u);
	if (mutual) parts.push(mutual);
	return parts.join(' · ');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** FormatDate: Go "2 Jan 2006" on the backend's UTC timestamp; '' for a zero time. */
export function formatDate(raw: string | null | undefined): string {
	if (!raw) return '';
	const d = new Date(raw);
	if (Number.isNaN(d.getTime()) || d.getUTCFullYear() <= 1) return '';
	return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Go Format("2006-01-02") for a <time datetime>. */
export function isoDate(raw: string | null | undefined): string {
	if (!raw) return '';
	const d = new Date(raw);
	return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/** Count / plural: "1 day", "3 days" (English, as in Go). */
export function count(n: number, singular: string, plural: string): string {
	return `${n} ${n === 1 ? singular : plural}`;
}
