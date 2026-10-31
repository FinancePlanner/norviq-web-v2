import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { loadSocialConfig } from '#lib/server/app-context.js';
import { groupsOn } from '#lib/nav.js';
import {
	boardsErrorText,
	groupInviteCodePattern
} from '#lib/features/public/invite/invite.server.js';

// POST /g/{code}/join — appHandler.GroupsRedeemInvite, mounted in the app group
// (RequireAuth + onboarding come from hooks.server.ts) behind RequireGroups.
// The /g/{code} page's Join form posts here.

interface GroupDetail {
	group: { id: string; defaultChannelId: string | null };
	channels: { id: string }[] | null;
}

/** groups.ChatHref */
const chatHref = (groupID: string, channelID: string) => `/groups/${groupID}/c/${channelID}`;

/** handlers.groupLanding */
function groupLanding(detail: GroupDetail): string {
	if (detail.group.defaultChannelId)
		return chatHref(detail.group.id, detail.group.defaultChannelId);
	const first = detail.channels?.[0];
	if (first) return chatHref(detail.group.id, first.id);
	return `/groups/${detail.group.id}/settings`;
}

/** handlers.withNotice */
function withNotice(path: string, notice: string): string {
	const sep = path.includes('?') ? '&' : '?';
	const hash = path.indexOf('#');
	if (hash >= 0) return path.slice(0, hash) + sep + 'notice=' + notice + path.slice(hash);
	return path + sep + 'notice=' + notice;
}

export const POST: RequestHandler = async (event) => {
	// middleware.RequireGroups
	if (!groupsOn(await loadSocialConfig(event))) error(404, 'Not Found');

	const code = event.params.code;
	if (!groupInviteCodePattern.test(code)) error(404, 'Not Found');

	let detail: GroupDetail;
	try {
		detail = await apiJSON<GroupDetail>(
			event,
			'POST',
			`/v1/group-invites/${encodeURIComponent(code)}/redeem`
		);
	} catch (err) {
		// groupsRedirectError(…, "/groups")
		if (isAPIError(err) && err.code === 'guidelines_required') {
			redirect(303, '/boards/guidelines?next=' + encodeURIComponent('/groups'));
		}
		if (isAPIError(err) && err.code === 'community_banned') {
			// Go rendered boards.BannedPage (403) in the shell here; v2 sends the
			// reader to /boards, which renders that same page for a banned viewer.
			redirect(303, '/boards');
		}
		if (!isAPIError(err) || err.status >= 500)
			console.error('groups action failed', event.url.pathname, err);
		redirect(303, '/groups?' + new URLSearchParams({ error: boardsErrorText(err) }).toString());
	}
	redirect(303, withNotice(groupLanding(detail), 'joined'));
};
