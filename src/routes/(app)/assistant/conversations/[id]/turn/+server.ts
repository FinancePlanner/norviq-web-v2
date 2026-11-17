import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import {
	aiConsentRequiredJSON,
	aiConsentReturnPath,
	isAIConsentRequired
} from '#lib/features/dashboard/ai-consent.server.js';
import {
	aiConsentRefusal,
	assistantTurn,
	formOf,
	parseUUID
} from '#lib/features/dashboard/assistant/assistant.server.js';
import { formValue } from '#lib/form-value.js';

// POST /assistant/conversations/{id}/turn (handlers.AssistantTurn): one
// non-streamed turn. Go answered the new Message fragment; this answers its
// MessageRow as JSON. No Go page posts here (the composer streams), so it is
// kept for parity only.
export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const refusal = await aiConsentRefusal(event);
	if (refusal) return refusal;
	const id = parseUUID(event.params.id);
	if (!id) return new Response('Invalid conversation', { status: 400 });
	const content = formValue(await formOf(event), 'content').trim();
	if (!content) return new Response('Message is required', { status: 400 });
	try {
		return Response.json(await assistantTurn(event, id, content));
	} catch (err) {
		if (isAIConsentRequired(err)) {
			return Response.json(aiConsentRequiredJSON(aiConsentReturnPath(event, { self: false })), {
				status: 403
			});
		}
		return new Response('Assistant is temporarily unavailable', { status: 502 });
	}
};
