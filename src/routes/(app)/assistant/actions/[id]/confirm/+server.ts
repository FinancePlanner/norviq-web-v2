import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import {
	confirmAction,
	confirmHoldings,
	confirmTrades,
	formOf,
	parseUUID,
	readHoldingsConfirmInput,
	readTradesConfirmInput
} from '#lib/features/dashboard/assistant/assistant.server.js';

// POST /assistant/actions/{id}/confirm (handlers.AssistantConfirmAction).
// Go swapped the answered card into #assistant-action-{id}; this answers the
// same choice as an ActionOutcome for ActionSlot.svelte. kind=watch (with
// title/schedule/spec) marks a standing-task card. A JSON body is the trades
// card's reviewed rows, or the holdings card's, forwarded as the backend's confirm body.
/** 25 rows of reviewed trades are a few KB; this only stops a runaway body. */
const MAX_TRADES_BODY_BYTES = 256 << 10;

export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const id = parseUUID(event.params.id);
	if (!id) return new Response('Invalid action', { status: 400 });
	// Every body here is small: refuse a runaway one before reading it.
	if (Number(event.request.headers.get('content-length')) > MAX_TRADES_BODY_BYTES)
		return new Response('Too many trades', { status: 413 });
	if (event.request.headers.get('content-type')?.includes('application/json')) {
		const raw = await event.request.json().catch(() => null);
		// A body with rows is the holdings card's; trades carry `trades`.
		const holdings = readHoldingsConfirmInput(raw);
		if (holdings) return Response.json(await confirmHoldings(event, id, holdings));
		const input = readTradesConfirmInput(raw);
		if (!input) return new Response('Invalid trades', { status: 400 });
		return Response.json(await confirmTrades(event, id, input));
	}
	return Response.json(await confirmAction(event, id, await formOf(event)));
};
