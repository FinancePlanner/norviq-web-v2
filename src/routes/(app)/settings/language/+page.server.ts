import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { LANG_COOKIE, normalizeLanguage } from '#lib/i18n/index.js';
import { config } from '#lib/server/env.js';

// Go Settings case "language" + SettingsLanguageSubmit. The form is a plain
// POST (no use:enhance), so the 303 back here is a full SSR render in the new
// locale, <html lang> included — same as the Go page.
export const load: PageServerLoad = async ({ locals, url }) => ({
	currentLanguage: locals.locale as string,
	successMessage: (url.searchParams.get('saved') ?? '').trim() === '1' ? 'Language saved.' : ''
});

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		let form: FormData;
		try {
			form = await request.formData();
		} catch {
			error(400, 'Invalid form submission.');
		}
		const lang = normalizeLanguage(String(form.get('language') ?? ''));
		if (!lang) error(400, 'Unsupported language.');
		// i18n.SetLanguageCookie
		cookies.set(LANG_COOKIE, lang, {
			path: '/',
			maxAge: 365 * 24 * 60 * 60,
			httpOnly: true,
			sameSite: 'lax',
			secure: config().cookieSecure
		});
		redirect(303, '/settings/language?saved=1');
	}
};
