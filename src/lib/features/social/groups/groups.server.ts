import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { APIError, apiJSON, isAPIError } from '#lib/server/api.js';
import { socialDo, socialTimezone, uuidParam } from '#lib/features/settings-admin/social/social.server.js';
import { BOARDS_BANNED } from '#lib/features/settings-admin/admin/boards-admin.js';
import { userTitle, type SocialUserSummary } from '#lib/features/settings-admin/social/privacy.js';
import type {
	CommunityViewerStatus,
	CreateGroupRequest,
	FriendOption,
	GroupChannel,
	GroupDetail,
	GroupDirectoryPage,
	GroupInvitation,
	GroupInviteLink,
	GroupListResponse,
	GroupMemberPage,
	GroupMessage,
	GroupMessagePage,
	GroupUnreadCount,
	MemberRow,
	UpdateGroupRequest
} from './types.js';
import { withQuery, type RowOptions } from './view.js';

// Server half of norviq-web internal/handlers/groups.go and the client in
// internal/api/groups.go. Every call goes through doBoardsRequest in Go: a
// non-2xx arrives as APIError carrying the backend's {code, reason}.

/** groupsFailure's 404 marker, rendered by (app)/groups/+error.svelte as the home page with an error. */
export const GROUPS_NOT_FOUND = 'groups-not-found';
export const GROUPS_NOT_FOUND_TEXT = "That group doesn't exist, or you're not in it.";
/** boards.BannedPage copy, carried by a redirect when a form post meets a ban. */
const BANNED_TEXT =
	'Your access to Norviq Boards has been removed. The rest of Norviq works as usual. If you think this is a mistake, write to us from Settings → Feedback.';

/** groupsPageSize is the first page of a channel and each older page. */
export const GROUPS_PAGE_SIZE = 50;

/** lastChannelKey: the channel a viewer last had open per group (Go scs key). */
export const lastChannelKey = (groupID: string) => 'groups.last.' + groupID;

const status = (err: unknown) => (isAPIError(err) ? err.status : 0);
const code = (err: unknown) => (isAPIError(err) ? (err.code ?? '') : '');

/** boardsErrorText: the backend's own reason for a 4xx, or a generic line. */
export function boardsErrorText(err: unknown): string {
	if (isAPIError(err) && err.status >= 400 && err.status < 500 && err.reason) return err.reason;
	return "That didn't work. Try again in a moment.";
}

/** Go's BoardsErrorFrom(err) == nil || Status >= 500. */
export const isServerFailure = (err: unknown) => !isAPIError(err) || err.status >= 500;

/** groupsID: a uuid path parameter, or a 404 without a round trip. */
export function groupsID(raw: string | undefined): string {
	const id = uuidParam(raw);
	if (!id) error(404, 'Not Found');
	return id;
}

/** groupsFailure: 404 and a global ban as their pages, anything else a 502. */
export function groupsFailure(err: unknown, path: string): never {
	if (status(err) === 404) error(404, GROUPS_NOT_FOUND);
	if (code(err) === BOARDS_BANNED) error(403, BOARDS_BANNED);
	console.error('groups request failed', path, err);
	error(502, 'Groups are temporarily unavailable');
}

/**
 * groupsRedirectError sends a form back where it came from with the
 * backend's reason. Go renders the banned page in place for a ban; a form
 * endpoint here cannot render a page, so the ban text rides the redirect.
 */
export function groupsRedirectError(err: unknown, back: string, path: string): never {
	if (code(err) === 'guidelines_required') redirect(303, '/boards/guidelines?next=' + encodeURIComponent(back));
	if (code(err) === BOARDS_BANNED) redirect(303, withQuery(back, 'error', BANNED_TEXT));
	if (isServerFailure(err)) console.error('groups action failed', path, err);
	redirect(303, withQuery(back, 'error', boardsErrorText(err)));
}

/** groupsReturnTo keeps redirects on this site's group pages. */
export function groupsReturnTo(raw: string): string {
	if (raw.startsWith('/groups') && !raw.startsWith('//') && !raw.includes('\\')) return raw;
	return '/groups';
}

/** refererGroupsPath: the group page a form was posted from, or /groups. */
export function refererGroupsPath(event: RequestEvent): string {
	const referer = event.request.headers.get('referer');
	if (!referer) return groupsReturnTo('');
	try {
		return groupsReturnTo(new URL(referer, event.url).pathname);
	} catch {
		return '/groups';
	}
}

export const viewerID = (event: RequestEvent) => event.locals.session.auth?.userId ?? '';

export function rowOptions(event: RequestEvent, canModerate: boolean, lastReadSeq: number): RowOptions {
	return { viewerID: viewerID(event), canModerate, lastReadSeq, timezone: socialTimezone(event) };
}

// MARK: backend calls (internal/api/groups.go)

const groupPath = (id: string, ...rest: string[]) =>
	'/v1/groups/' + encodeURIComponent(id) + rest.map((s) => '/' + encodeURIComponent(s)).join('');
const channelPath = (channelID: string, rest = '') => '/v1/group-channels/' + encodeURIComponent(channelID) + rest;

export const myGroups = (e: RequestEvent) => apiJSON<GroupListResponse>(e, 'GET', '/v1/groups');
export const groupUnreadCount = (e: RequestEvent) => apiJSON<GroupUnreadCount>(e, 'GET', '/v1/groups/unread-count');

/** DiscoverGroups: a query starting with $ searches by ticker, as on iOS. */
export function discoverGroups(e: RequestEvent, query: string, cursor: string) {
	const q: Record<string, string> = {};
	if (query.length > 1 && query[0] === '$') q.ticker = query.slice(1);
	else if (query !== '') q.q = query;
	if (cursor !== '') q.cursor = cursor;
	return apiJSON<GroupDirectoryPage>(e, 'GET', '/v1/groups/discover', undefined, { query: q });
}

export const createGroup = (e: RequestEvent, req: CreateGroupRequest) => apiJSON<GroupDetail>(e, 'POST', '/v1/groups', req);
export const getGroup = (e: RequestEvent, id: string) => apiJSON<GroupDetail>(e, 'GET', groupPath(id));
export const updateGroup = (e: RequestEvent, id: string, req: UpdateGroupRequest) =>
	apiJSON<GroupDetail>(e, 'PATCH', groupPath(id), req);
export const deleteGroup = (e: RequestEvent, id: string) => apiJSON(e, 'DELETE', groupPath(id));
export const joinGroup = (e: RequestEvent, id: string) => apiJSON<GroupDetail>(e, 'POST', groupPath(id, 'join'));
export const leaveGroup = (e: RequestEvent, id: string) => apiJSON(e, 'POST', groupPath(id, 'leave'));
export const setGroupPush = (e: RequestEvent, id: string, pushEnabled: boolean) =>
	apiJSON(e, 'PUT', groupPath(id, 'notifications'), { pushEnabled });
export const groupMembers = (e: RequestEvent, id: string) => apiJSON<GroupMemberPage>(e, 'GET', groupPath(id, 'members'));
export const setGroupMemberRole = (e: RequestEvent, id: string, userID: string, role: string) =>
	apiJSON(e, 'PATCH', groupPath(id, 'members', userID), { role });
export const kickGroupMember = (e: RequestEvent, id: string, userID: string) =>
	apiJSON(e, 'DELETE', groupPath(id, 'members', userID));
export const banGroupMember = (e: RequestEvent, id: string, userID: string) =>
	apiJSON(e, 'POST', groupPath(id, 'bans'), { userId: userID });
export const transferGroup = (e: RequestEvent, id: string, userID: string) =>
	apiJSON(e, 'POST', groupPath(id, 'transfer'), { userId: userID });
export const createGroupChannel = (e: RequestEvent, id: string, name: string) =>
	apiJSON<GroupChannel>(e, 'POST', groupPath(id, 'channels'), { name });
export const deleteGroupChannel = (e: RequestEvent, channelID: string) => apiJSON(e, 'DELETE', channelPath(channelID));

export interface MessageQuery {
	before?: number;
	/** Sent whenever set, since after=0 (everything) is a real query. */
	after?: number;
	limit?: number;
}

export function groupMessages(e: RequestEvent, channelID: string, q: MessageQuery) {
	const query: Record<string, number> = {};
	if (q.before && q.before > 0) query.before = q.before;
	if (q.after !== undefined) query.after = q.after;
	if (q.limit && q.limit > 0) query.limit = q.limit;
	return apiJSON<GroupMessagePage>(e, 'GET', channelPath(channelID, '/messages'), undefined, { query });
}

/** SendGroupMessage is idempotent on clientMessageId. */
export const sendGroupMessage = (e: RequestEvent, channelID: string, clientMessageId: string, body: string) =>
	apiJSON<GroupMessage>(e, 'POST', channelPath(channelID, '/messages'), { clientMessageId, body });
export const markGroupChannelRead = (e: RequestEvent, channelID: string, seq: number) =>
	apiJSON(e, 'POST', channelPath(channelID, '/read'), { seq });
export const deleteGroupMessage = (e: RequestEvent, messageID: string) =>
	apiJSON(e, 'DELETE', '/v1/group-messages/' + encodeURIComponent(messageID));
export const reportGroupMessage = (e: RequestEvent, messageID: string, reason: string) =>
	apiJSON(e, 'POST', '/v1/group-messages/' + encodeURIComponent(messageID) + '/report', { reason });

export async function groupInviteLinks(e: RequestEvent, id: string): Promise<GroupInviteLink[]> {
	const out = await apiJSON<{ items?: GroupInviteLink[] | null }>(e, 'GET', groupPath(id, 'invites'));
	return out?.items ?? [];
}
/** CreateGroupInviteLink with the backend's defaults (7 days, unlimited). */
export const createGroupInviteLink = (e: RequestEvent, id: string) =>
	apiJSON<GroupInviteLink>(e, 'POST', groupPath(id, 'invites'), {});
export const revokeGroupInvite = (e: RequestEvent, inviteID: string) =>
	apiJSON(e, 'DELETE', '/v1/group-invites/' + encodeURIComponent(inviteID));
export const inviteFriendsToGroup = (e: RequestEvent, id: string, userIds: string[]) =>
	apiJSON<{ invitedUserIds?: string[] }>(e, 'POST', groupPath(id, 'invitations'), { userIds });

export async function groupInvitations(e: RequestEvent): Promise<GroupInvitation[]> {
	const out = await apiJSON<{ items?: GroupInvitation[] | null }>(e, 'GET', '/v1/groups/invitations');
	return out?.items ?? [];
}
export const acceptGroupInvitation = (e: RequestEvent, id: string) =>
	apiJSON<GroupDetail>(e, 'POST', '/v1/groups/invitations/' + encodeURIComponent(id) + '/accept');
export const declineGroupInvitation = (e: RequestEvent, id: string) =>
	apiJSON(e, 'POST', '/v1/groups/invitations/' + encodeURIComponent(id) + '/decline');

export const communityViewer = (e: RequestEvent) => apiJSON<CommunityViewerStatus>(e, 'GET', '/v1/community/me');
export const blockCommunityUser = (e: RequestEvent, username: string) =>
	apiJSON(e, 'POST', '/v1/community/blocks', { username });

// MARK: page helpers

/** postBlockedReason explains a composer the backend won't let the viewer use. */
export async function postBlockedReason(event: RequestEvent): Promise<string> {
	let s: CommunityViewerStatus;
	try {
		s = await communityViewer(event);
	} catch {
		return '';
	}
	if (s.activeSanction?.kind === 'mute') return "You're muted in the Norviq community and can't chat right now.";
	if (!s.hasUsername) return 'Pick a username in Settings to chat.';
	if (!s.guidelinesAccepted) return 'Accept the community guidelines on Boards to chat.';
	return '';
}

/** invitableFriends lists the viewer's friends who aren't members yet. */
export async function invitableFriends(event: RequestEvent, members: MemberRow[]): Promise<FriendOption[]> {
	let list: { friends?: SocialUserSummary[] | null };
	try {
		list = await socialDo(event, 'GET', '/v1/social/friends');
	} catch (err) {
		console.warn('friends load failed', err);
		return [];
	}
	const inGroup = new Set(members.map((m) => m.userId.toLowerCase()));
	return (list?.friends ?? []).filter((f) => !inGroup.has(f.id.toLowerCase())).map((f) => ({ id: f.id, name: userTitle(f) }));
}

/**
 * groupsAction runs one settings form against the backend and redirects to
 * the settings page with a notice, or with the backend's reason.
 */
export async function groupsAction(
	event: RequestEvent,
	notice: string,
	run: (groupID: string) => Promise<unknown>
): Promise<never> {
	const groupID = groupsID(event.params.groupID);
	const back = '/groups/' + groupID + '/settings';
	try {
		await run(groupID);
	} catch (err) {
		groupsRedirectError(err, back, event.url.pathname);
	}
	redirect(303, back + '?notice=' + notice);
}

/** A 4xx refusal built in the web tier (Go's &api.BoardsError{...}). */
export const refusal = (status: number, reason = '') => new APIError(status, reason);
