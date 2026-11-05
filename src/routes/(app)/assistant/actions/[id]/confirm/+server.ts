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
/** 25 rows of reviewed trades are a few KB; this only stops a runaway body. */
const MAX_TRADES_BODY_BYTES = 256 << 10;

export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const id = parseUUID(event.params.id);
	if (!id) return text('Invalid action', { status: 400 });
	// Every body here is small: refuse a runaway one before reading it.
	if (Number(event.request.headers.get('content-length')) > MAX_TRADES_BODY_BYTES)
		return text('Too many trades', { status: 413 });
	if (event.request.headers.get('content-type')?.includes('application/json')) {
		const input = readTradesConfirmInput(await event.request.json().catch(() => null));
		if (!input) return text('Invalid trades', { status: 400 });
		return json(await confirmTrades(event, id, input));
	}
	return json(await confirmAction(event, id, await formOf(event)));
};
