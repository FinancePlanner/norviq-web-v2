// Port of norviq-web community boards: internal/api/boards.go (wire shapes),
// internal/pages/boards/{viewmodel.go,helpers.go} and the pure helpers of
// internal/handlers/boards.go. Client-safe: no server imports here.
//
// The strings are English literals in Go too (boards.templ never calls
// i18n.T), so they stay literals.

import type { Option } from '#lib/components/norviq/types.js';
import { boardAge } from '#lib/features/settings-admin/admin/boards-admin.js';

export { boardAge };

// MARK: - Wire shapes (StockPlanShared BoardsDTOs, camelCase)

export interface BoardSummary {
	id: string;
	slug: string;
	name: string;
	description: string;
	creatorUsername?: string | null;
	postCount: number;
	createdAt: string;
	lastActivityAt: string;
}

export interface BoardPostSummary {
	id: string;
	boardSlug: string;
	kind: string;
	title: string;
	url?: string | null;
	domain?: string | null;
	tags?: string[] | null;
	authorUsername?: string | null;
	createdAt: string;
	score: number;
	commentCount: number;
	participantCount: number;
	viewCount: number;
	viewerHasVoted: boolean;
	newCommentCount?: number | null;
	aiGenerated?: boolean;
	aiTopic?: string | null;
}

export interface BoardListResponse {
	items?: BoardSummary[] | null;
	nextCursor?: string | null;
	dailyPost?: BoardPostSummary | null;
}

export interface BoardPostPage {
	items?: BoardPostSummary[] | null;
	nextCursor?: string | null;
}

export interface BoardComment {
	id: string;
	parentId?: string | null;
	depth: number;
	authorUsername?: string | null;
	body: string;
	createdAt: string;
	isDeleted: boolean;
}

export interface BoardPostDetail {
	post: BoardPostSummary;
	body?: string | null;
	comments?: BoardComment[] | null;
}

export interface BoardVoteResponse {
	score: number;
	voted: boolean;
}

export interface CommunityViewerStatus {
	isAdmin: boolean;
	guidelinesAccepted: boolean;
	hasUsername: boolean;
	activeSanction?: {
		id: string;
		username?: string | null;
		kind: string;
		reason: string;
		expiresAt?: string | null;
		createdAt: string;
		revokedAt?: string | null;
	} | null;
}

export interface CreateBoardRequest {
	slug: string;
	name: string;
	description: string;
}

export interface CreateBoardPostRequest {
	kind: string;
	title: string;
	url: string | null;
	body: string | null;
	tags: string[];
}

export interface BoardNotification {
	id: string;
	kind: string;
	actorUsername?: string | null;
	postId: string;
	boardSlug: string;
	postTitle: string;
	commentId?: string | null;
	excerpt?: string | null;
	createdAt: string;
	isRead: boolean;
}

export interface BoardNotificationPage {
	items?: BoardNotification[] | null;
	nextCursor?: string | null;
	unreadCount: number;
}

export interface BoardNotificationSettings {
	replyPush: boolean;
	upvotePush: boolean;
}

// MARK: - View models (viewmodel.go)

/** Viewer: what every boards page needs to decide which controls to draw. */
export interface Viewer {
	isAdmin: boolean;
	/** False while muted, without a username, or before the guidelines are accepted. */
	canWrite: boolean;
	/** Set while muted ("indefinitely" when there is no end). */
	mutedUntil: string;
	needsSetup: boolean;
	needsUsername: boolean;
	username: string;
}

export interface BoardCard {
	slug: string;
	name: string;
	description: string;
	creator: string;
	postCount: number;
	lastActivity: string;
}

export interface PostRow {
	id: string;
	boardSlug: string;
	kind: string;
	title: string;
	url: string;
	domain: string;
	tags: string[];
	author: string;
	age: string;
	score: number;
	voted: boolean;
	comments: number;
	newComments: number;
	participants: number;
	views: number;
	canDelete: boolean;
	aiGenerated: boolean;
}

export interface CommentRow {
	id: string;
	author: string;
	age: string;
	body: string;
	depth: number;
	deleted: boolean;
	canDelete: boolean;
	canReply: boolean;
}

export interface ActivityRow {
	kind: string;
	actor: string;
	title: string;
	excerpt: string;
	link: string;
	age: string;
	unread: boolean;
}

/** ReportReasons: the list the report menus offer, in order. */
export const REPORT_REASONS: { value: string; label: string }[] = [
	{ value: 'spam', label: 'Spam' },
	{ value: 'harassment', label: 'Harassment' },
	{ value: 'hate', label: 'Hate' },
	{ value: 'scam', label: 'Scam' },
	{ value: 'impersonation', label: 'Impersonation' },
	{ value: 'inappropriate', label: 'Inappropriate' },
	{ value: 'other', label: 'Other' }
];

// MARK: - Handler helpers (handlers/boards.go)

/** boardNotices: ?notice= values map to fixed copy, so the query can never put arbitrary text on the page. */
export const BOARD_NOTICES: Record<string, string> = {
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

export function boardNotice(raw: string | null): string {
	return Object.hasOwn(BOARD_NOTICES, raw ?? '') ? BOARD_NOTICES[raw ?? ''] : '';
}

/**
 * boardReturnTo keeps redirects on this site's boards and moderation pages,
 * and on group pages, whose guidelines prompt comes back through here.
 */
export function boardReturnTo(raw: string, fallback: string): string {
	if (
		raw.startsWith('/boards') ||
		raw.startsWith('/admin/community') ||
		raw.startsWith('/groups')
	) {
		if (!raw.startsWith('//') && !raw.includes('\\')) return raw;
	}
	return fallback;
}

export function withNotice(path: string, notice: string): string {
	const separator = path.includes('?') ? '&' : '?';
	const i = path.indexOf('#');
	if (i >= 0) return path.slice(0, i) + separator + 'notice=' + notice + path.slice(i);
	return path + separator + 'notice=' + notice;
}

/** Go url.PathEscape: escapes everything except unreserved chars and $&+:=@. */
export function pathEscape(s: string): string {
	return encodeURIComponent(s)
		.replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
		.replace(/%(24|26|2B|3A|3D|40)/g, (m) => decodeURIComponent(m));
}

/** Go url.QueryEscape: like encodeURIComponent but spaces become '+' and !'()* are escaped. */
export function queryEscape(s: string): string {
	return encodeURIComponent(s)
		.replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
		.replace(/%20/g, '+');
}

/** Go url.Values.Encode: keys sorted, values in order, QueryEscape'd. */
export function encodeValues(values: [string, string][]): string {
	return [...values]
		.map((pair, i) => ({ pair, i }))
		.sort((a, b) => (a.pair[0] < b.pair[0] ? -1 : a.pair[0] > b.pair[0] ? 1 : a.i - b.i))
		.map(({ pair: [k, v] }) => queryEscape(k) + '=' + queryEscape(v))
		.join('&');
}

/** stripNotice: the query without ?notice=, Go-encoded. */
export function stripNotice(params: URLSearchParams): string {
	return encodeValues([...params.entries()].filter(([k]) => k !== 'notice'));
}

export function splitBoardTags(raw: string): string[] {
	return raw
		.split(/[, ]/)
		.map((part) => part.trim())
		.filter((part) => part !== '');
}

export function boardCard(board: BoardSummary, now = new Date()): BoardCard {
	return {
		slug: board.slug,
		name: board.name,
		description: board.description,
		creator: board.creatorUsername ?? '',
		postCount: board.postCount,
		lastActivity: boardAge(new Date(board.lastActivityAt), now)
	};
}

export function boardPostRow(post: BoardPostSummary, viewer: Viewer, now = new Date()): PostRow {
	const url = post.url ?? '';
	const author = post.authorUsername ?? '';
	const aiGenerated = !!post.aiGenerated;
	return {
		id: post.id,
		boardSlug: post.boardSlug,
		kind: post.kind,
		title: post.title,
		tags: post.tags ?? [],
		age: boardAge(new Date(post.createdAt), now),
		score: post.score,
		voted: post.viewerHasVoted,
		comments: post.commentCount,
		participants: post.participantCount,
		views: post.viewCount,
		url: url.startsWith('https://') || url.startsWith('http://') ? url : '',
		domain: post.domain ?? '',
		author,
		newComments: post.newCommentCount ?? 0,
		aiGenerated,
		canDelete: viewer.isAdmin || (author !== '' && author === viewer.username && !aiGenerated)
	};
}

/**
 * boardCommentRows orders the flat comment list depth-first so each reply sits
 * under its parent. A reply whose parent is missing (deleted with its account)
 * is shown at the top level rather than lost.
 */
export function boardCommentRows(
	comments: BoardComment[],
	viewer: Viewer,
	now = new Date()
): CommentRow[] {
	const known = new Set(comments.map((c) => c.id));
	const children = new Map<string, BoardComment[]>();
	const roots: BoardComment[] = [];
	for (const c of comments) {
		if (c.parentId != null && known.has(c.parentId)) {
			const list = children.get(c.parentId) ?? [];
			list.push(c);
			children.set(c.parentId, list);
		} else {
			roots.push(c);
		}
	}
	const rows: CommentRow[] = [];
	const walk = (c: BoardComment, depth: number) => {
		const author = c.authorUsername ?? '';
		rows.push({
			id: c.id,
			author,
			age: boardAge(new Date(c.createdAt), now),
			body: c.body,
			depth: Math.min(depth, 8),
			deleted: c.isDeleted,
			canDelete: !c.isDeleted && (viewer.isAdmin || (author !== '' && author === viewer.username)),
			canReply: viewer.canWrite && !c.isDeleted && c.depth < 8
		});
		for (const child of children.get(c.id) ?? []) walk(child, depth + 1);
	};
	for (const root of roots) walk(root, 0);
	return rows;
}

// MARK: - Template helpers (pages/boards/helpers.go)

/** boardURL: a board link with only the non-default filters set (/boards/{slug}?sort=new). */
export function boardURL(slug: string, sort: string, kind: string, tag: string): string {
	const query: [string, string][] = [['sort', sort || 'new']];
	if (kind) query.push(['kind', kind]);
	if (tag) query.push(['tag', tag]);
	return '/boards/' + pathEscape(slug) + '?' + encodeValues(query);
}

/** toggleKind turns a chip off when it is already the active filter. */
export const toggleKind = (current: string, kind: string) => (current === kind ? '' : kind);

export const postURL = (post: Pick<PostRow, 'boardSlug' | 'id'>) =>
	'/boards/' + pathEscape(post.boardSlug) + '/p/' + pathEscape(post.id);

export function commentLabel(count: number): string {
	if (count === 0) return 'discuss';
	if (count === 1) return '1 comment';
	return `${count} comments`;
}

export const voteClass = (voted: boolean) =>
	voted
		? 'rounded p-1 text-[var(--color-accent)] hover:bg-black/5 dark:hover:bg-white/10'
		: 'rounded p-1 hover:bg-black/5 dark:hover:bg-white/10';

export const reasonOptions = (): Option[] =>
	REPORT_REASONS.map((r) => ({ value: r.value, label: r.label }));

export function kindOptions(selected: string): Option[] {
	const sel = selected || 'link';
	return [
		{ value: 'link', label: 'Link' },
		{ value: 'text', label: 'Discussion' },
		{ value: 'ask', label: 'Ask' },
		{ value: 'show', label: 'Show' }
	].map((o) => ({ ...o, selected: o.value === sel }));
}
