import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { redirectWith, requireSocial, socialDo, socialErrorMessage, uuidParam } from '#lib/features/settings-admin/social/social.server.js';
import type { SocialUserSummary } from '#lib/features/settings-admin/social/privacy.js';

// Port of norviq-web handlers.BlockedUsers / BlockedUserUnblock
// (internal/handlers/social_settings.go), behind RequireSocial. Go's
// POST /settings/blocked/{userId}/unblock is the ?/unblock action here.
export const load: PageServerLoad = async (event) => {
	await requireSocial(event);
	let users: SocialUserSummary[] = [];
	let hasLoadError = false;
	let errorMessage = event.url.searchParams.get('error') ?? '';
	try {
		const blocked = await socialDo<{ users?: SocialUserSummary[] | null }>(event, 'GET', '/v1/social/blocks');
		users = blocked?.users ?? [];
	} catch (err) {
		hasLoadError = true;
		errorMessage = socialErrorMessage(err, 'Could not load blocked people.');
	}
	return {
		users,
		successMessage: event.url.searchParams.get('notice') ?? '',
		errorMessage,
		hasLoadError
	};
};

export const actions: Actions = {
	unblock: async (event) => {
		await requireSocial(event);
		const form = await event.request.formData();
		const userID = uuidParam(String(form.get('userId') ?? ''));
		if (!userID) error(400, 'Invalid user');
		try {
			await socialDo(event, 'DELETE', '/v1/social/blocks/' + userID);
		} catch (err) {
			redirectWith('/settings/blocked', '', socialErrorMessage(err, 'Could not unblock.'));
		}
		redirectWith('/settings/blocked', 'Unblocked.', '');
	}
};
