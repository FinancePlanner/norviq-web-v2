// Ports of norviq-web handlers/public_invite.go (/i/{code}) and
// handlers/group_invite.go (/g/{code}): the fallbacks for invite links the iOS
// app would otherwise claim as universal links. Signed out they never call the
// backend; signed in (with the feature on) they preview and offer Accept/Join.

import { error, type RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { config, DEFAULT_IOS_APP_STORE_URL } from '#lib/server/env.js';
import { loadSocialConfig } from '#lib/server/app-context.js';
import { groupsOn } from '#lib/nav.js';
import { socialErrorMessage } from '#lib/features/settings-admin/social/social.server.js';
import { publicAbsoluteURL } from '../stock/load.server.js';
import type { GroupInviteVM, InviteVM, SocialUserSummary } from './types.js';

/** inviteCodePattern: what the backend's invite route accepts. */
const inviteCodePattern = /^[A-Za-z0-9_-]{4,64}$/;

/** groupInviteCodePattern: InviteCode.generate (letters and digits). */
export const groupInviteCodePattern = /^[A-Za-z0-9]{6,32}$/;

/** url.PathEscape for the code (already restricted to URL-safe characters). */
const pathEscape = (s: string) => encodeURIComponent(s);

function shared(code: string, path: string) {
	const cfg = config();
	return {
		appStoreURL: cfg.iosAppStoreURL || DEFAULT_IOS_APP_STORE_URL,
		canonicalURL: publicAbsoluteURL(cfg.publicBaseURL, path + code),
		ogImageURL: publicAbsoluteURL(cfg.publicBaseURL, '/static/images/og.png')
	};
}

/**
 * Go set `public, max-age=300` on the signed-out hand-off. The root layout here
 * serialises the signed-in user into every page, so a visitor with a session
 * (feature off, so still the hand-off) gets the same max-age as a private
 * response instead.
 */
function handOffCacheControl(event: RequestEvent): string {
	return event.locals.session.isAuthenticated ? 'private, max-age=300' : 'public, max-age=300';
}

/** handlers.PublicInvite */
export async function loadInvite(event: RequestEvent): Promise<InviteVM> {
	const code = event.params.code ?? '';
	if (!inviteCodePattern.test(code)) error(404, 'Not Found');

	const vm: InviteVM = {
		code,
		appURL: 'financeplan://invite/' + pathEscape(code),
		...shared(code, '/i/'),
		inviter: null,
		inviteError: '',
		signupURL: '',
		loginURL: ''
	};

	// signedInInvite: a session and the backend has friends switched on.
	// AttachSocialConfig resolves to "off" without a session.
	const authed = event.locals.session.isAuthenticated;
	if (authed && (await loadSocialConfig(event)).enabled) {
		try {
			const inviter = await apiJSON<SocialUserSummary>(
				event,
				'GET',
				'/v1/social/invites/' + pathEscape(code)
			);
			if (inviter.id.toLowerCase() === (event.locals.session.auth?.userId ?? '').toLowerCase()) {
				vm.inviteError = 'This is your own invite link. Share it with a friend.';
			} else {
				vm.inviter = inviter;
			}
		} catch (err) {
			vm.inviteError =
				isAPIError(err) && err.status === 404
					? 'This invite link has expired or was revoked.'
					: socialErrorMessage(err, 'Could not load this invite right now.');
		}
		event.setHeaders({ 'Cache-Control': 'private, no-store' });
		return vm;
	}

	const next = encodeURIComponent('/i/' + code);
	vm.signupURL = '/signup?next=' + next;
	vm.loginURL = '/login?next=' + next;
	event.setHeaders({ 'Cache-Control': handOffCacheControl(event) });
	return vm;
}

interface GroupInvitePreview {
	code: string;
	group: {
		id: string;
		name: string;
		iconEmoji: string | null;
		ticker: string | null;
		memberCount: number;
	};
	inviterUsername: string | null;
	alreadyMember: boolean;
}

/** handlers.boardsErrorText: the backend's own reason for a 4xx, or a generic line. */
export function boardsErrorText(err: unknown): string {
	if (isAPIError(err) && err.status >= 400 && err.status < 500 && err.reason) return err.reason;
	return "That didn't work. Try again in a moment.";
}

/** handlers.PublicGroupInvite */
export async function loadGroupInvite(event: RequestEvent): Promise<GroupInviteVM> {
	const code = event.params.code ?? '';
	if (!groupInviteCodePattern.test(code)) error(404, 'Not Found');

	const vm: GroupInviteVM = {
		code,
		appURL: 'financeplan://groups/join/' + pathEscape(code),
		...shared(code, '/g/'),
		groupName: '',
		groupEmoji: '',
		groupTicker: '',
		members: 0,
		inviter: '',
		openURL: '',
		inviteError: '',
		signupURL: '',
		loginURL: ''
	};

	if (event.locals.session.isAuthenticated && groupsOn(await loadSocialConfig(event))) {
		try {
			const preview = await apiJSON<GroupInvitePreview>(
				event,
				'GET',
				'/v1/group-invites/' + pathEscape(code)
			);
			vm.groupName = preview.group.name;
			vm.members = preview.group.memberCount;
			vm.groupEmoji = preview.group.iconEmoji ?? '';
			vm.groupTicker = preview.group.ticker ?? '';
			vm.inviter = preview.inviterUsername ?? '';
			if (preview.alreadyMember) vm.openURL = '/groups/' + preview.group.id;
		} catch (err) {
			vm.inviteError =
				isAPIError(err) && err.status === 404
					? "This invite link doesn't work any more. Ask for a new one."
					: boardsErrorText(err);
		}
		event.setHeaders({ 'Cache-Control': 'private, no-store' });
		return vm;
	}

	const next = encodeURIComponent('/g/' + code);
	vm.signupURL = '/signup?next=' + next;
	vm.loginURL = '/login?next=' + next;
	event.setHeaders({ 'Cache-Control': handOffCacheControl(event) });
	return vm;
}
