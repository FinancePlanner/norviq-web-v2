import { error, type RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { BOARDS_BANNED, sanctionRow } from '#lib/features/settings-admin/admin/boards-admin.js';
import type {
	BoardComment,
	BoardListResponse,
	BoardNotificationPage,
	BoardNotificationSettings,
	BoardPostDetail,
	BoardPostPage,
	BoardPostSummary,
	BoardSummary,
	BoardVoteResponse,
	CommunityViewerStatus,
	CreateBoardPostRequest,
	CreateBoardRequest,
	Viewer
} from './boards.js';
import { boardCommentRows, boardNotice, boardPostRow, pathEscape } from './boards.js';
import { boardsFailure } from '#lib/features/settings-admin/admin/boards-admin.server.js';

export { boardsErrorText, boardsFailure } from '#lib/features/settings-admin/admin/boards-admin.server.js';

// Calls from norviq-web internal/api/boards.go (doBoardsRequest). A non-2xx
// arrives as APIError carrying the backend's {code, reason} envelope, which
// is Go's BoardsError.

/** api.IsBoardsCode */
export const isBoardsCode = (err: unknown, code: string) => isAPIError(err) && err.code === code;
/** api.IsBoardsNotFound */
export const isBoardsNotFound = (err: unknown) => isAPIError(err) && err.status === 404;

export const communityViewer = (e: RequestEvent) => apiJSON<CommunityViewerStatus>(e, 'GET', '/v1/community/me');

export async function acceptCommunityGuidelines(e: RequestEvent): Promise<void> {
	await apiJSON(e, 'POST', '/v1/community/guidelines/accept');
}

export async function blockCommunityUser(e: RequestEvent, username: string): Promise<void> {
	await apiJSON(e, 'POST', '/v1/community/blocks', { username });
}

export const listBoards = (e: RequestEvent, cursor: string) =>
	apiJSON<BoardListResponse>(e, 'GET', '/v1/boards', undefined, { query: { cursor } });

export const createBoard = (e: RequestEvent, req: CreateBoardRequest) =>
	apiJSON<BoardSummary>(e, 'POST', '/v1/boards', req);

export const getBoard = (e: RequestEvent, slug: string) =>
	apiJSON<BoardSummary>(e, 'GET', '/v1/boards/' + pathEscape(slug));

export const listBoardPosts = (
	e: RequestEvent,
	slug: string,
	q: { sort: string; kind: string; tag: string; cursor: string }
) => apiJSON<BoardPostPage>(e, 'GET', '/v1/boards/' + pathEscape(slug) + '/posts', undefined, { query: q });

export const createBoardPost = (e: RequestEvent, slug: string, req: CreateBoardPostRequest) =>
	apiJSON<BoardPostSummary>(e, 'POST', '/v1/boards/' + pathEscape(slug) + '/posts', req);

export const getBoardPost = (e: RequestEvent, id: string) =>
	apiJSON<BoardPostDetail>(e, 'GET', '/v1/board-posts/' + pathEscape(id));

export async function deleteBoardPost(e: RequestEvent, id: string): Promise<void> {
	await apiJSON(e, 'DELETE', '/v1/board-posts/' + pathEscape(id));
}

export const voteBoardPost = (e: RequestEvent, id: string) =>
	apiJSON<BoardVoteResponse>(e, 'POST', '/v1/board-posts/' + pathEscape(id) + '/vote');

export const createBoardComment = (e: RequestEvent, postID: string, parentId: string | null, body: string) =>
	apiJSON<BoardComment>(e, 'POST', '/v1/board-posts/' + pathEscape(postID) + '/comments', { parentId, body });

export async function deleteBoardComment(e: RequestEvent, id: string): Promise<void> {
	await apiJSON(e, 'DELETE', '/v1/board-comments/' + pathEscape(id));
}

/** ReportBoardContent reports exactly one of a post or a comment. */
export async function reportBoardContent(
	e: RequestEvent,
	postId: string | null,
	commentId: string | null,
	reason: string,
	note: string
): Promise<void> {
	await apiJSON(e, 'POST', '/v1/board-reports', { postId, commentId, reason, note: note || null });
}

export async function adminDeleteBoard(e: RequestEvent, slug: string): Promise<void> {
	await apiJSON(e, 'DELETE', '/v1/admin/boards/' + pathEscape(slug));
}

export const listBoardNotifications = (e: RequestEvent, cursor: string) =>
	apiJSON<BoardNotificationPage>(e, 'GET', '/v1/community/notifications', undefined, { query: { cursor } });

export async function boardUnreadCount(e: RequestEvent): Promise<number> {
	const out = await apiJSON<{ unreadCount?: number }>(e, 'GET', '/v1/community/notifications/unread-count');
	return out?.unreadCount ?? 0;
}

/** Marks the given ids read, or everything when ids is null. */
export async function markBoardNotificationsRead(e: RequestEvent, ids: string[] | null): Promise<void> {
	await apiJSON(e, 'POST', '/v1/community/notifications/read', { ids });
}

export const boardNotificationSettings = (e: RequestEvent) =>
	apiJSON<BoardNotificationSettings>(e, 'GET', '/v1/community/notification-settings');

export const updateBoardNotificationSettings = (e: RequestEvent, settings: BoardNotificationSettings) =>
	apiJSON<BoardNotificationSettings>(e, 'PUT', '/v1/community/notification-settings', settings);

/**
 * loadBoardsViewer fetches /community/me. A ban renders the banned page (403,
 * via boards/+error.svelte); a backend failure is a 502.
 */
export async function loadBoardsViewer(event: RequestEvent): Promise<Viewer> {
	let status: CommunityViewerStatus;
	try {
		status = await communityViewer(event);
	} catch (err) {
		console.error('community viewer load failed', err);
		error(502, 'Boards are temporarily unavailable');
	}
	const viewer: Viewer = {
		isAdmin: status.isAdmin,
		needsUsername: !status.hasUsername,
		needsSetup: !status.guidelinesAccepted && !status.isAdmin,
		username: event.locals.session.auth?.username ?? '',
		mutedUntil: '',
		canWrite: false
	};
	const s = status.activeSanction;
	if (s && !status.isAdmin) {
		if (s.kind === 'ban') error(403, BOARDS_BANNED);
		// sanctionRow renders an expiry as Go's "until Jan 2, 15:04".
		viewer.mutedUntil = s.expiresAt ? sanctionRow({ ...s, revokedAt: null }, new Date()).expires : 'indefinitely';
	}
	viewer.canWrite = viewer.mutedUntil === '' && !viewer.needsUsername && !viewer.needsSetup;
	return viewer;
}

/** Form value as Go's r.FormValue: "" when missing. */
export const formValue = (form: FormData, key: string) => {
	const v = form.get(key);
	return typeof v === 'string' ? v : '';
};

/** GET on a Go POST-only route: chi answered 405. */
export function methodNotAllowed(): never {
	error(405, 'Method Not Allowed');
}

/** renderBoardsPost's data (handlers.BoardsPost): the post page for id. */
export async function loadPostPage(event: RequestEvent, id: string) {
	const viewer = await loadBoardsViewer(event);
	let detail: BoardPostDetail;
	try {
		detail = await getBoardPost(event, id);
	} catch (err) {
		boardsFailure(err, 'post');
	}
	const now = new Date();
	const post = boardPostRow(detail.post, viewer, now);
	return {
		viewer,
		post,
		body: detail.body ?? '',
		comments: boardCommentRows(detail.comments ?? [], viewer, now),
		notice: boardNotice(event.url.searchParams.get('notice')),
		backURL: '/boards/' + pathEscape(post.boardSlug) + '/p/' + pathEscape(post.id)
	};
}
