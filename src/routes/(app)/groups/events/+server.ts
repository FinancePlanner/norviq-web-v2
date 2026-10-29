import type { RequestHandler } from '@sveltejs/kit';
import { apiFetch } from '#lib/server/api.js';
import { requireGroups } from '#lib/features/social/gates.server.js';

// GroupsEvents proxies the backend's per-user realtime stream
// (GET /v1/realtime/stream) to the browser's EventSource, as Go did. The
// backend closes the stream every ten minutes and EventSource reconnects.
export const GET: RequestHandler = async (event) => {
	await requireGroups(event);
	let upstream: Response;
	try {
		upstream = await apiFetch(event, 'GET', '/v1/realtime/stream', null, {
			headers: { Accept: 'text/event-stream' },
			signal: event.request.signal
		});
	} catch {
		return new Response('unavailable', { status: 502 });
	}
	if (upstream.status !== 200 || !upstream.body) {
		await upstream.body?.cancel().catch(() => {});
		// 401 tells EventSource to stop; anything else it retries.
		const passthrough = [401, 403, 404].includes(upstream.status);
		return new Response(null, { status: passthrough ? upstream.status : 502 });
	}
	return new Response(upstream.body, {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache',
			'X-Accel-Buffering': 'no'
		}
	});
};
