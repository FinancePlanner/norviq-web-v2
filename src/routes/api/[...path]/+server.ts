import { error, type RequestHandler } from '@sveltejs/kit';
import { apiFetch } from '#lib/server/api.js';

// Same-origin proxy so browser code (TanStack Query, streams, uploads) can call
// the backend without ever seeing the access token: /api/v1/x → BACKEND/v1/x
// with the session's bearer attached. Cross-site requests are already refused
// by SvelteKit's CSRF origin check for non-GET methods.

const FORWARD_REQUEST = ['content-type', 'accept', 'if-none-match', 'last-event-id'];
const FORWARD_RESPONSE = [
	'content-type',
	'content-disposition',
	'cache-control',
	'etag',
	'last-modified',
	'retry-after'
];

const handler: RequestHandler = async (event) => {
	const path = event.params.path ?? '';
	if (!path.startsWith('v1/')) error(404, 'Not found');
	if (!event.locals.session.isAuthenticated) error(401, 'Unauthorized');

	const headers: Record<string, string> = {};
	for (const name of FORWARD_REQUEST) {
		const v = event.request.headers.get(name);
		if (v) headers[name] = v;
	}
	const hasBody = event.request.method !== 'GET' && event.request.method !== 'HEAD';
	const upstream = await apiFetch(
		event,
		event.request.method,
		`/${path}${event.url.search}`,
		hasBody ? await event.request.arrayBuffer() : null,
		{ headers, signal: event.request.signal }
	);

	const out = new Headers();
	for (const name of FORWARD_RESPONSE) {
		const v = upstream.headers.get(name);
		if (v) out.set(name, v);
	}
	if (!out.has('cache-control')) out.set('cache-control', 'private, no-store');
	return new Response(upstream.body, { status: upstream.status, headers: out });
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
