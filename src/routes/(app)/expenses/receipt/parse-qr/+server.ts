import { error, json, type RequestHandler } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';

// POST /expenses/receipt/parse-qr (ReceiptsHandler.ParseQR): the decoded QR
// string from ReceiptScan → backend /v1/receipts/parse-qr → draft JSON.
export const POST: RequestHandler = async (event) => {
	const raw = await event.request.text();
	if (raw.length > 8 * 1024) error(400, 'invalid request');
	let payload = '';
	try {
		payload = String((JSON.parse(raw) as { payload?: unknown }).payload ?? '').trim();
	} catch {
		error(400, 'invalid request');
	}
	if (!payload) error(400, 'empty payload');
	try {
		return json(await apiJSON(event, 'POST', '/v1/receipts/parse-qr', { payload }));
	} catch (err) {
		console.error('parse receipt qr', err);
		error(502, 'failed to parse receipt');
	}
};
