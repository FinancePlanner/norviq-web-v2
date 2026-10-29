import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { apiFetch } from '#lib/server/api.js';
import { AI_CONSENT_REQUIRED, aiConsentRequiredJSON, aiConsentReturnPath } from '#lib/features/dashboard/ai-consent.server.js';
import { aiConsentRefusal, formOf, parseUUID } from '#lib/features/dashboard/assistant/assistant.server.js';

// POST /assistant/conversations/{id}/stream (handlers.AssistantStreamTurn).
// The composer posts its form here; this turns it into the backend's JSON
// body and relays the SSE response unbuffered, untouched (Go copied it through
// with a Flush per read). A backend 403 is not a stream: an AI consent
// refusal goes back as JSON with a consentUrl so the reader can navigate.
const RELAYED = ['content-type', 'cache-control', 'x-accel-buffering'];

export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const refusal = await aiConsentRefusal(event);
	if (refusal) return refusal;
	const id = parseUUID(event.params.id);
	if (!id) return text('Invalid conversation', { status: 400 });
	const content = String((await formOf(event)).get('content') ?? '').trim();
	if (!content) return text('Message is required', { status: 400 });

	let upstream: Response;
	try {
		upstream = await apiFetch(event, 'POST', `/v1/ai/assistant/conversations/${id}/stream`, JSON.stringify({ content }), {
			headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
			signal: event.request.signal
		});
	} catch {
		return text('Assistant is temporarily unavailable', { status: 502 });
	}
	if (upstream.status === 403) {
		const body = (await upstream.text().catch(() => '')).slice(0, 4096);
		let reason = '';
		try {
			reason = String((JSON.parse(body) as { reason?: unknown }).reason ?? '');
		} catch {
			/* not JSON */
		}
		if (reason === AI_CONSENT_REQUIRED) {
			return json(aiConsentRequiredJSON(aiConsentReturnPath(event, { self: false })), { status: 403 });
		}
		return text('Assistant is temporarily unavailable', { status: 403 });
	}
	const headers = new Headers();
	for (const name of RELAYED) {
		const value = upstream.headers.get(name);
		if (value) headers.set(name, value);
	}
	return new Response(upstream.body, { status: upstream.status, headers });
};
