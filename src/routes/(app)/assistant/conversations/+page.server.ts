import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { apiJSON } from '#lib/server/api.js';
import { aiConsentReturnPath, hasAIConsent } from '#lib/features/dashboard/ai-consent.server.js';

// POST /assistant/conversations (handlers.AssistantCreateConversation): the
// "New conversation" / "New chat" forms and the suggestion chips (seed) post
// here natively. It is a page action rather than a +server.ts so the Pro gate
// and the consent page render inside the shell, as in Go.

// Go registered only POST; chi answered a GET with 405.
export const load: PageServerLoad = async (event) => {
	if (event.request.method === 'GET') error(405, 'Method Not Allowed');
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		await requireFeature(event, Feature.AIInsights, 'AI insights');
		if (!(await hasAIConsent(event))) {
			// RenderAIConsentRequired: a form post gets the full consent page.
			return { aiConsentRequired: true as const, next: aiConsentReturnPath(event) };
		}
		let id = '';
		try {
			const created = await apiJSON<{ id: string }>(
				event,
				'POST',
				'/v1/ai/assistant/conversations',
				{ title: 'New conversation' }
			);
			id = created?.id ?? '';
		} catch (err) {
			console.warn('assistant create conversation failed', err);
		}
		if (!id) redirect(303, '/assistant');
		let target = '/assistant?conversation=' + encodeURIComponent(id);
		const form = await event.request.formData().catch(() => new FormData());
		const seed = String(form.get('seed') ?? '').trim();
		if (seed) target += '&seed=' + encodeURIComponent(seed);
		redirect(303, target);
	}
};
