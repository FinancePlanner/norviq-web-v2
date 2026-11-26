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
import { formValue, scalarText } from '#lib/form-value.js';

// POST /assistant/conversations/{id}/stream (handlers.AssistantStreamTurn).
// The composer posts its form here; this turns it into the backend's JSON
// body and relays the SSE response unbuffered, untouched (Go copied it through
// with a Flush per read). A backend 403 is not a stream: an AI consent
// refusal goes back as JSON with a consentUrl so the reader can navigate, and
// an upgrade refusal as JSON with code upgrade_required.
//
// A turn with attached files (images, a PDF or a CSV) goes upstream as multipart
// (content + file parts); a text turn stays JSON, because a multipart request
// spends the user's image rate budget even when it carries no file. The
// composer names its parts "file", as iOS does; "image" is still read.
/** The backend's turn body cap (turnBodyLimit): three images plus the form. */
const MAX_BODY_BYTES = 16 << 20;
const RELAYED = ['content-type', 'cache-control', 'x-accel-buffering'];

export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.AIInsights, 'AI insights');
	const refusal = await aiConsentRefusal(event);
	if (refusal) return refusal;
	const id = parseUUID(event.params.id);
	if (!id) return new Response('Invalid conversation', { status: 400 });
	// Refuse before buffering a body the backend would refuse anyway.
	if (Number(event.request.headers.get('content-length')) > MAX_BODY_BYTES)
		return new Response('That image is too large.', { status: 413 });
	const form = await formOf(event);
	const content = formValue(form, 'content').trim();
	const files = [...form.getAll('file'), ...form.getAll('image')].filter(
		(f): f is File => f instanceof File && f.size > 0
	);
	if (!content && files.length === 0) return new Response('Message is required', { status: 400 });
	let body: BodyInit;
	let contentType: Record<string, string> = {};
	if (files.length > 0) {
		// No Content-Type: fetch adds the multipart one with its boundary.
		const multipart = new FormData();
		multipart.set('content', content);
		for (const file of files) multipart.append('file', file, file.name);
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
		return new Response('Assistant is temporarily unavailable', { status: 502 });
	}
	if (upstream.status === 403) {
		const refused = (await upstream.text().catch(() => '')).slice(0, 4096);
		let reason = '';
		let code = '';
		try {
			const parsed = JSON.parse(refused) as { reason?: unknown; code?: unknown };
			reason = scalarText(parsed.reason);
			code = scalarText(parsed.code);
		} catch {
			/* not JSON */
		}
		if (code === 'upgrade_required') return Response.json({ code }, { status: 403 });
		if (reason === AI_CONSENT_REQUIRED) {
			return Response.json(aiConsentRequiredJSON(aiConsentReturnPath(event, { self: false })), {
				status: 403
			});
		}
		return new Response('Assistant is temporarily unavailable', { status: 403 });
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
		return new Response(reason || 'Assistant unavailable', { status: 503 });
	}
	const headers = new Headers();
	for (const name of RELAYED) {
		const value = upstream.headers.get(name);
		if (value) headers.set(name, value);
	}
	return new Response(upstream.body, { status: upstream.status, headers });
};
