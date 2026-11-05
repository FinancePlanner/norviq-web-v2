import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { apiJSON } from '#lib/server/api.js';
import { aiConsentRefusal } from '#lib/features/dashboard/assistant/assistant.server.js';

// POST /assistant/quick: the Quick Q card's own conversation. bindMessaging is
// false so a question asked here never reaches a linked Telegram chat, which
// follows the latest conversation otherwise.
export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const refusal = await aiConsentRefusal(event);
	if (refusal) return refusal;
	try {
		const created = await apiJSON<{ id: string }>(event, 'POST', '/v1/ai/assistant/conversations', {
			title: 'Quick Q',
			bindMessaging: false
		});
		if (created?.id) return json({ id: created.id });
	} catch (err) {
		console.warn('quick q create conversation failed', err);
	}
	return text('Assistant unavailable', { status: 502 });
};
