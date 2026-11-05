import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { apiFetch } from '#lib/server/api.js';
import {
	AI_CONSENT_REQUIRED,
	aiConsentRequiredJSON,
	aiConsentReturnPath
} from '#lib/features/dashboard/ai-consent.server.js';
import {
	aiConsentRefusal,
	formOf,
	parseUUID
} from '#lib/features/dashboard/assistant/assistant.server.js';

// POST /assistant/conversations/{id}/stream (handlers.AssistantStreamTurn).
// The composer posts its form here; this turns it into the backend's JSON
// body and relays the SSE response unbuffered, untouched (Go copied it through
// with a Flush per read). A backend 403 is not a stream: an AI consent
// refusal goes back as JSON with a consentUrl so the reader can navigate, and
// an upgrade refusal as JSON with code upgrade_required.
//
// A turn with attached images goes upstream as multipart (content + image
// parts); a text turn stays JSON, because a multipart request spends the
// user's image rate budget even when it carries no image.
/** The backend's turn body cap (turnBodyLimit): three images plus the form. */
const MAX_BODY_BYTES = 16 << 20;
const RELAYED = ['content-type', 'cache-control', 'x-accel-buffering'];

export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const refusal = await aiConsentRefusal(event);
	if (refusal) return refusal;
	const id = parseUUID(event.params.id);
	if (!id) return text('Invalid conversation', { status: 400 });
	// Refuse before buffering a body the backend would refuse anyway.
	if (Number(event.request.headers.get('content-length')) > MAX_BODY_BYTES)
		return text('That image is too large.', { status: 413 });
	const form = await formOf(event);
	const content = String(form.get('content') ?? '').trim();
	const images = form.getAll('image').filter((f): f is File => f instanceof File && f.size > 0);
	if (!content && images.length === 0) return text('Message is required', { status: 400 });
	let body: BodyInit;
	let contentType: Record<string, string> = {};
	if (images.length > 0) {
		// No Content-Type: fetch adds the multipart one with its boundary.
		const multipart = new FormData();
		multipart.set('content', content);
		for (const image of images) multipart.append('image', image, image.name);
		body = multipart;
	} else {
		body = JSON.stringify({ content });
		contentType = { 'Content-Type': 'application/json' };
	}

	let upstream: Response;
	try {
		upstream = await apiFetch(event, 'POST', `/v1/ai/assistant/conversations/${id}/stream`, body, {
			headers: { ...contentType, Accept: 'text/event-stream' },
			signal: event.request.signal
		});
	} catch {
		return text('Assistant is temporarily unavailable', { status: 502 });
	}
	if (upstream.status === 403) {
		const body = (await upstream.text().catch(() => '')).slice(0, 4096);
		let reason = '';
		let code = '';
		try {
			const parsed = JSON.parse(body) as { reason?: unknown; code?: unknown };
			reason = String(parsed.reason ?? '');
			code = String(parsed.code ?? '');
		} catch {
			/* not JSON */
		}
		if (code === 'upgrade_required') return json({ code }, { status: 403 });
		if (reason === AI_CONSENT_REQUIRED) {
			return json(aiConsentRequiredJSON(aiConsentReturnPath(event, { self: false })), {
				status: 403
			});
		}
		return text('Assistant is temporarily unavailable', { status: 403 });
	}
	if (upstream.status === 503) {
		// Only the backend's own JSON reason is shown (large-image slots full).
		// A proxy's page, an empty body or {"error":true} stay the generic line.
		const raw = (await upstream.text().catch(() => '')).slice(0, 4096);
		let reason = '';
		try {
			const parsed = JSON.parse(raw) as { reason?: unknown };
			if (typeof parsed.reason === 'string') reason = parsed.reason.trim().slice(0, 300);
		} catch {
			/* not JSON */
		}
		return text(reason || 'Assistant unavailable', { status: 503 });
	}
	const headers = new Headers();
	for (const name of RELAYED) {
		const value = upstream.headers.get(name);
		if (value) headers.set(name, value);
	}
	return new Response(upstream.body, { status: upstream.status, headers });
};
