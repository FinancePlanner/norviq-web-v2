// Port of the /admin/community view model: norviq-web
// internal/pages/boards/viewmodel.go (SanctionRow, ReportRow, AdminViewModel),
// internal/api/boards.go (UserSanction, BoardReportItem, CreateSanctionRequest)
// and the board helpers in internal/handlers/boards.go (boardNotices,
// boardAge). The boards domain ports the same helpers; dedupe when merging.

export interface UserSanction {
	id: string;
	username?: string | null;
	kind: string;
	reason: string;
	expiresAt?: string | null;
	createdAt: string;
	revokedAt?: string | null;
}

export interface BoardReportItem {
	id: string;
	reporterUsername?: string | null;
	postId?: string | null;
	commentId?: string | null;
	boardSlug?: string | null;
	excerpt: string;
	targetAuthorUsername?: string | null;
	reason: string;
	note?: string | null;
	createdAt: string;
}

export interface CreateSanctionRequest {
	username: string;
	kind: string;
	reason: string;
	durationHours: number | null;
}

export interface SanctionRow {
	id: string;
	username: string;
	kind: string;
	reason: string;
	expires: string;
	created: string;
	active: boolean;
}

export interface ReportRow {
	id: string;
	reporter: string;
	author: string;
	reason: string;
	note: string;
	excerpt: string;
	link: string;
	created: string;
	isComment: boolean;
	postID: string;
	commentID: string;
}

const boardNotices: Record<string, string> = {
	reported: 'Thanks. A person will review the report.',
	blocked: "Blocked. You won't see their posts or comments.",
	deleted: 'Deleted.',
	board: 'Board deleted.',
	sanctioned: 'Done. It applies from their next request.',
	lifted: 'Lifted.',
	resolved: 'Report dismissed.',
	commented: '',
	guidelines: "You're set. Welcome to Boards.",
	report_fail: "That report didn't go through. Try again.",
	settings: 'Push settings saved.'
};

/** boardNotice: the flash text for ?notice=, or "". */
export function boardNotice(raw: string | null): string {
	const key = raw ?? '';
	return Object.hasOwn(boardNotices, key) ? boardNotices[key] : '';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Go time layouts the Go server rendered in its own zone (UTC in the
// cluster, as on a Worker): "Jan 2, 15:04" and "Jan 2, 2006".
function goJan2Clock(d: Date): string {
	const hh = String(d.getUTCHours()).padStart(2, '0');
	const mm = String(d.getUTCMinutes()).padStart(2, '0');
	return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${hh}:${mm}`;
}

function goJan2Year(d: Date): string {
	return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** boardAge: the compact "7h", "1d" age. */
export function boardAge(t: Date, now: Date): string {
	const ms = now.getTime() - t.getTime();
	const minute = 60_000;
	const hour = 60 * minute;
	if (ms < minute) return 'now';
	if (ms < hour) return `${Math.trunc(ms / minute)}m`;
	if (ms < 24 * hour) return `${Math.trunc(ms / hour)}h`;
	if (ms < 30 * 24 * hour) return `${Math.trunc(ms / hour / 24)}d`;
	return goJan2Year(t);
}

export function sanctionRow(s: UserSanction, now: Date): SanctionRow {
	const expiresAt = s.expiresAt ? new Date(s.expiresAt) : null;
	const row: SanctionRow = {
		id: s.id,
		username: s.username ?? '',
		kind: s.kind,
		reason: s.reason,
		created: boardAge(new Date(s.createdAt), now) + ' ago',
		expires: 'indefinite',
		active: !s.revokedAt && (!expiresAt || expiresAt.getTime() > now.getTime())
	};
	if (expiresAt) row.expires = 'until ' + goJan2Clock(expiresAt);
	if (s.revokedAt) row.expires = 'lifted';
	return row;
}

export function reportRow(rep: BoardReportItem, now: Date): ReportRow {
	const row: ReportRow = {
		id: rep.id,
		reason: rep.reason,
		excerpt: rep.excerpt,
		created: boardAge(new Date(rep.createdAt), now) + ' ago',
		isComment: rep.commentId != null,
		reporter: rep.reporterUsername ?? '',
		author: rep.targetAuthorUsername ?? '',
		note: rep.note ?? '',
		postID: rep.postId ?? '',
		commentID: rep.commentId ?? '',
		link: ''
	};
	if (rep.postId != null && rep.boardSlug != null) {
		row.link = '/boards/' + encodeURIComponent(rep.boardSlug) + '/p/' + encodeURIComponent(rep.postId);
		if (rep.commentId != null) row.link += '#c-' + encodeURIComponent(rep.commentId);
	}
	return row;
}

/** Marker prefix in App.Error.message that admin/community/+error.svelte renders as the boards NotFoundPage. */
export const BOARDS_NOT_FOUND = 'boards-not-found:';
/** App.Error.message that admin/community/+error.svelte renders as the boards BannedPage. */
export const BOARDS_BANNED = 'community_banned';
