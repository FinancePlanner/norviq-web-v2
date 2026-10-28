import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { dismissTip, parseUUID } from '#lib/features/dashboard/assistant/assistant.server.js';

// DELETE /assistant/tips/{id} (handlers.AssistantDismissTip): an empty 200 on
// success, which Tip.svelte takes as "remove the card".
export const DELETE: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const id = parseUUID(event.params.id);
	if (!id) return text('Invalid tip', { status: 400 });
	if (!(await dismissTip(event, id))) return text('Tip could not be dismissed', { status: 502 });
	return new Response(null, { status: 200 });
};
