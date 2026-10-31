import type { Actions, PageServerLoad } from './$types';
import { facebookImportOn } from '#lib/nav.js';
import {
	redirectWith,
	requireSocial,
	socialDo,
	socialErrorMessage
} from '#lib/features/settings-admin/social/social.server.js';
import {
	formChoice,
	privacySettingsFrom,
	privacyToggles,
	SearchVisibility,
	type SocialPrivacySettings
} from '#lib/features/settings-admin/social/privacy.js';

// Port of norviq-web handlers.FriendsPrivacy / FriendsPrivacySubmit
// (internal/handlers/social_settings.go), behind RequireSocial.
export const load: PageServerLoad = async (event) => {
	const cfg = await requireSocial(event);
	let settings = privacySettingsFrom(null);
	let hasLoadError = false;
	let errorMessage = event.url.searchParams.get('error') ?? '';
	try {
		settings = privacySettingsFrom(
			await socialDo<Partial<SocialPrivacySettings>>(event, 'GET', '/v1/social/privacy')
		);
	} catch (err) {
		hasLoadError = true;
		errorMessage = socialErrorMessage(err, 'Could not load your privacy settings.');
	}
	return {
		settings,
		toggles: privacyToggles(cfg),
		facebookImport: facebookImportOn(cfg),
		successMessage: event.url.searchParams.get('notice') ?? '',
		errorMessage,
		hasLoadError
	};
};

export const actions: Actions = {
	// Reads the current settings first and changes only the switches the page
	// showed: an unchecked switch posts nothing, so a field the page did not
	// render must not be read as "off".
	default: async (event) => {
		const cfg = await requireSocial(event);
		const form = await event.request.formData();
		let current: SocialPrivacySettings;
		try {
			current = privacySettingsFrom(
				await socialDo<Partial<SocialPrivacySettings>>(event, 'GET', '/v1/social/privacy')
			);
		} catch (err) {
			redirectWith(
				'/settings/friends-privacy',
				'',
				socialErrorMessage(err, 'Could not save your privacy settings.')
			);
		}
		current.searchVisibility = formChoice(
			String(form.get('searchVisibility') ?? ''),
			current.searchVisibility,
			SearchVisibility.Everyone,
			SearchVisibility.FriendsOfFriends,
			SearchVisibility.Nobody
		);
		// Each switch the form rendered carries a hidden shown=<key> marker; an
		// unchecked switch posts nothing else, so the marker is what tells "shown
		// and off" apart from "not on this form". Only marked switches are written.
		const shown = new Set(form.getAll('shown').map(String));
		for (const toggle of privacyToggles(cfg)) {
			if (!shown.has(toggle.key)) continue;
			current[toggle.key] = form.get(toggle.key) === 'true';
		}
		try {
			await socialDo(event, 'PUT', '/v1/social/privacy', current);
		} catch (err) {
			redirectWith(
				'/settings/friends-privacy',
				'',
				socialErrorMessage(err, 'Could not save your privacy settings.')
			);
		}
		redirectWith('/settings/friends-privacy', 'Privacy settings saved.', '');
	}
};
