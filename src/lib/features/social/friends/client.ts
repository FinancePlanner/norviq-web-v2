import { goto } from '$app/navigation';
import type { Attachment } from 'svelte/attachments';

// Browser helpers for the friends/XP port. Client-safe: no #lib/server imports.

/** Must match friends.server.ts FETCH_HEADER (Go's HX-Request). */
export const FETCH_HEADER = 'x-nq-fetch';

/** POST a form the way htmx did: same URL, form-encoded, flagged as a fetch. */
export function postForm(form: HTMLFormElement): Promise<Response> {
	return fetch(form.action, {
		method: 'POST',
		body: new URLSearchParams(new FormData(form) as unknown as Record<string, string>),
		headers: { [FETCH_HEADER]: '1', accept: 'application/json' }
	});
}

/**
 * The Go shell hx-boosts every form: post in the background, then land on the
 * page the handler redirected to with its flash. `confirmMessage` is Go's
 * confirmOnSubmit. Without JS the form posts natively and gets the 303.
 */
export function boostedForm(confirmMessage = ''): Attachment<HTMLFormElement> {
	return (form) => {
		const onSubmit = async (e: SubmitEvent) => {
			if (confirmMessage && !confirm(confirmMessage)) {
				e.preventDefault();
				return;
			}
			e.preventDefault();
			if (form.classList.contains('htmx-request')) return;
			form.classList.add('htmx-request');
			try {
				const res = await postForm(form);
				const body = (await res.json().catch(() => null)) as { location?: string } | null;
				if (body?.location) {
					await goto(body.location, { invalidateAll: true });
					return;
				}
				HTMLFormElement.prototype.submit.call(form);
			} catch {
				HTMLFormElement.prototype.submit.call(form);
			} finally {
				form.classList.remove('htmx-request');
			}
		};
		form.addEventListener('submit', onSubmit);
		return () => form.removeEventListener('submit', onSubmit);
	};
}

/**
 * scripts.js rememberTimezone: the backend counts check-in days and streaks in
 * the user's zone, read server-side from this cookie (X-Timezone).
 */
export function rememberTimezone(): void {
	try {
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (!zone || zone.length > 64) return;
		const current = document.cookie.split('; ').find((part) => part.startsWith('tz='));
		if (current === 'tz=' + zone) return;
		const secure = location.protocol === 'https:' ? '; Secure' : '';
		document.cookie = 'tz=' + zone + '; Path=/; Max-Age=31536000; SameSite=Lax' + secure;
	} catch {
		/* no Intl or cookies blocked: the server falls back to UTC */
	}
}
