import { error, json, type RequestHandler } from '@sveltejs/kit';
import { Feature } from '#lib/billing.js';
import { apiFetch } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import {
	AI_CONSENT_REQUIRED_REASON,
	aiConsentMissing,
	aiConsentReturnPath,
	isAIConsentRequired
} from '#lib/features/money/receipts/ai-consent.server.js';

// POST /expenses/receipt/ocr (ReceiptsHandler.ScanOCR), gated by
// requireReceiptScan + requireAIConsent. Takes the multipart field "image" and
// proxies it to /v1/receipts/ocr as field "file" (same filename and content
// type as the Go multipart writer). The image is never stored.

const MAX_RECEIPT_IMAGE_BYTES = 8 << 20;

function consentRefusal(next: string) {
	// RenderAIConsentRequired for a script fetch: the backend's 403 shape + consentUrl.
	return json(
		{
			error: true,
			reason: AI_CONSENT_REQUIRED_REASON,
			consentUrl: '/ai-consent?next=' + encodeURIComponent(next)
		},
		{ status: 403 }
	);
}

export const POST: RequestHandler = async (event) => {
	await requireFeature(event, Feature.ReceiptScan, 'Receipt scanning');
	if (await aiConsentMissing(event)) return consentRefusal(aiConsentReturnPath(event));

	const length = Number(event.request.headers.get('content-length') ?? 0);
	if (length > MAX_RECEIPT_IMAGE_BYTES + 4096) error(400, 'image too large or invalid');
	let form: FormData;
	try {
		form = await event.request.formData();
	} catch {
		error(400, 'image too large or invalid');
	}
	const file = form.get('image');
	if (!(file instanceof File)) error(400, 'missing image');
	if (file.size > MAX_RECEIPT_IMAGE_BYTES) error(400, 'image too large or invalid');
	const data = await file.arrayBuffer();
	if (data.byteLength === 0) error(502, 'failed to scan receipt');

	const upstream = new FormData();
	upstream.append(
		'file',
		new Blob([data], file.type ? { type: file.type } : {}),
		file.name || 'receipt.jpg'
	);
	const res = await apiFetch(event, 'POST', '/v1/receipts/ocr', upstream);
	const body = await res.text();
	if (isAIConsentRequired(res.status, body)) return consentRefusal(aiConsentReturnPath(event));
	if (!res.ok) {
		console.error('scan receipt ocr', res.status, body.slice(0, 200));
		error(502, 'failed to scan receipt');
	}
	return new Response(body, { headers: { 'Content-Type': 'application/json' } });
};
