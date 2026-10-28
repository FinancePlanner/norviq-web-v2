import { error, type RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import {
	BOARDS_BANNED,
	BOARDS_NOT_FOUND,
	type BoardReportItem,
	type CreateSanctionRequest,
	type UserSanction
} from './boards-admin.js';

// Admin calls from norviq-web internal/api/boards.go (doBoardsRequest). A
// non-2xx arrives as APIError carrying the backend's {code, reason} envelope,
// which is Go's BoardsError.

export async function adminListSanctions(event: RequestEvent): Promise<UserSanction[]> {
	const out = await apiJSON<{ items?: UserSanction[] | null }>(event, 'GET', '/v1/admin/community/sanctions');
	return out?.items ?? [];
}

export function adminCreateSanction(event: RequestEvent, req: CreateSanctionRequest): Promise<UserSanction> {
	return apiJSON<UserSanction>(event, 'POST', '/v1/admin/community/sanctions', req);
}

export async function adminRevokeSanction(event: RequestEvent, id: string): Promise<void> {
	await apiJSON(event, 'DELETE', '/v1/admin/community/sanctions/' + encodeURIComponent(id));
}

export async function adminListBoardReports(event: RequestEvent): Promise<BoardReportItem[]> {
	const out = await apiJSON<{ items?: BoardReportItem[] | null }>(event, 'GET', '/v1/admin/community/reports');
	return out?.items ?? [];
}

export async function adminResolveBoardReport(event: RequestEvent, id: string): Promise<void> {
	await apiJSON(event, 'POST', '/v1/admin/community/reports/' + encodeURIComponent(id) + '/resolve');
}

/**
 * boardsFailure: a backend 404 becomes the boards not-found page, a ban the
 * banned page (403), anything else a 502. Rendered by admin/community/+error.svelte.
 */
export function boardsFailure(err: unknown, what: string): never {
	if (isAPIError(err) && err.status === 404) error(404, BOARDS_NOT_FOUND + what);
	if (isAPIError(err) && err.code === BOARDS_BANNED) error(403, BOARDS_BANNED);
	console.error('boards request failed', what, err);
	error(502, 'Boards are temporarily unavailable');
}

/** boardsErrorText: the backend's own reason for a 4xx, or a generic line. */
export function boardsErrorText(err: unknown): string {
	if (isAPIError(err) && err.status >= 400 && err.status < 500 && err.reason) return err.reason;
	return "That didn't work. Try again in a moment.";
}
