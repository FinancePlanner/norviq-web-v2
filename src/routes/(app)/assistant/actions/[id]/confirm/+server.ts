import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import {
	confirmAction,
	confirmTrades,
	formOf,
	parseUUID,
	readTradesConfirmInput
} from '#lib/features/dashboard/assistant/assistant.server.js';

// POST /assistant/actions/{id}/confirm (handlers.AssistantConfirmAction).
// Go swapped the answered card into #assistant-action-{id}; this answers the
// same choice as an ActionOutcome for ActionSlot.svelte. kind=watch (with
// title/schedule/spec) marks a standing-task card. A JSON body is the trades
// card's reviewed rows, forwarded as the backend's confirm body.
export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const id = parseUUID(event.params.id);
	if (!id) return text('Invalid action', { status: 400 });
	if (event.request.headers.get('content-type')?.includes('application/json')) {
		const input = readTradesConfirmInput(await event.request.json().catch(() => null));
		if (!input) return text('Invalid trades', { status: 400 });
		return json(await confirmTrades(event, id, input));
	}
	return json(await confirmAction(event, id, await formOf(event)));
};
