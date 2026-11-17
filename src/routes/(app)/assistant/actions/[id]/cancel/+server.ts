import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import {
	cancelAction,
	formOf,
	parseUUID
} from '#lib/features/dashboard/assistant/assistant.server.js';

// POST /assistant/actions/{id}/cancel (handlers.AssistantCancelAction), the
// counterpart of confirm: answers an ActionOutcome.
export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const id = parseUUID(event.params.id);
	if (!id) return new Response('Invalid action', { status: 400 });
	return Response.json(await cancelAction(event, id, await formOf(event)));
};
