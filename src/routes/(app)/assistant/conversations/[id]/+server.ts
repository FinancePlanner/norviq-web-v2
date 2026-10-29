import { json, redirect, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import {
	aiConsentRefusal,
	loadAssistantConversation,
	parseUUID
} from '#lib/features/dashboard/assistant/assistant.server.js';

// GET /assistant/conversations/{id} (handlers.AssistantConversation). Go
// answered the Workspace fragment for the rail's hx-get and the post-turn
// reload; here the page fetches the ConversationViewModel as JSON and renders
// Workspace itself. A browser navigating here directly (Go would have shown
// the bare fragment) is sent to the full page with the conversation open.
export const GET: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const id = parseUUID(event.params.id);
	if (!id) return text('Invalid conversation', { status: 400 });
	const accept = event.request.headers.get('accept') ?? '';
	if (accept.includes('text/html') && !accept.includes('application/json')) {
		redirect(303, '/assistant?conversation=' + id);
	}
	const refusal = await aiConsentRefusal(event);
	if (refusal) return refusal;
	const vm = await loadAssistantConversation(event, id);
	if (!vm) return text('Conversation unavailable', { status: 502 });
	return json(vm, { headers: { 'cache-control': 'private, no-store' } });
};
