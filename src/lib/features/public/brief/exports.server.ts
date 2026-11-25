// The brief's rendered exports (link preview, social post, story, A4 PDF).
// The Go backend renders them; this Worker only proxies and caches them in
// the edge cache, because rendering would blow the Free plan's 10 ms CPU limit.
//
// Cache key = origin + path + ?lang=, plus rev (and v) when valid, so a
// cache-busting query string hits the same entry. rev and v go to the backend
// only as a pair, exactly as received: a lone rev (the og:image case) stays in
// the key and the backend gets an unversioned request, because the backend
// answers 404 to any stale rev.
import type { RequestEvent } from '@sveltejs/kit';
import { apiFetch } from '#lib/server/api.js';
import { MISSING_CACHE_CONTROL, parsePermalink, urlLang } from './brief.server.js';
import type { ExportFormat } from './export/types.js';

export const EXPORT_FILES = {
	'og.png': 'og',
	'card.png': 'social',
	'social.png': 'social',
	'story.png': 'story',
	'report.pdf': 'pdf'
} as const satisfies Record<string, ExportFormat>;

export type ExportFile = keyof typeof EXPORT_FILES;

const UPSTREAM_TIMEOUT = 25_000;
const PASS_HEADERS = ['Content-Type', 'Cache-Control', 'ETag', 'Content-Disposition'];

function positiveInt(raw: string | null): number | null {
	if (raw === null || !/^\d+$/.test(raw)) return null;
	const n = Number(raw);
	return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** The normalised cache key, and the rev/v pair when both are valid. */
export function exportKey(
	url: URL,
	path: string
): { key: string; pair: { rev: number; v: number } | null } {
	const rev = positiveInt(url.searchParams.get('rev'));
	const v = positiveInt(url.searchParams.get('v'));
	let key = url.origin + path + '?lang=' + urlLang(url);
	if (rev !== null) key += '&rev=' + rev;
	if (rev !== null && v !== null) key += '&v=' + v;
	return { key, pair: rev !== null && v !== null ? { rev, v } : null };
}

function notFound(): Response {
	return new Response('404 page not found\n', {
		status: 404,
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': MISSING_CACHE_CONTROL }
	});
}

/** The status mapping: a backend 400/404 is a 404, anything else a retryable 503. */
export function upstreamError(status: number | 'network'): Response {
	if (status === 400 || status === 404) return notFound();
	return new Response('Temporarily unavailable\n', {
		status: 503,
		headers: {
			'Retry-After': '60',
			'Cache-Control': 'no-store',
			'Content-Type': 'text/plain; charset=utf-8'
		}
	});
}

/** A response rebuilt from the whitelisted headers only. */
export function whitelisted(upstream: Response): Response {
	const headers = new Headers({ 'X-Content-Type-Options': 'nosniff' });
	for (const name of PASS_HEADERS) {
		const value = upstream.headers.get(name);
		if (value !== null) headers.set(name, value);
	}
	return new Response(upstream.body, { status: upstream.status, headers });
}

/** Workers' `caches.default`, which the DOM CacheStorage type does not declare. */
function edgeCache(event: RequestEvent): Cache | null {
	const storage: unknown = event.platform?.caches;
	if (!storage || typeof storage !== 'object' || !('default' in storage)) return null;
	const cache: unknown = storage.default;
	return cache && typeof cache === 'object' && 'match' in cache && 'put' in cache
		? (cache as Cache)
		: null;
}

/**
 * The shared edge-cache path. The lookup carries the client's conditional
 * headers so cache.match answers 304/206 itself. Only a 200 is stored.
 */
export async function cached(
	event: RequestEvent,
	key: string,
	produce: () => Promise<Response>
): Promise<Response> {
	const cache = edgeCache(event);
	if (!cache || !event.platform) return produce();
	const lookup = new Headers();
	for (const name of ['If-None-Match', 'Range']) {
		const value = event.request.headers.get(name);
		if (value !== null) lookup.set(name, value);
	}
	const hit = await cache.match(new Request(key, { headers: lookup }));
	if (hit) return hit;
	const response = await produce();
	if (response.status === 200)
		event.platform.ctx.waitUntil(cache.put(new Request(key), response.clone()));
	return response;
}

export async function serveExport(event: RequestEvent, file: ExportFile): Promise<Response> {
	const permalink = parsePermalink(event.params.date ?? '', event.params.slot ?? '');
	if (!permalink) return notFound();
	const { key, pair } = exportKey(event.url, event.url.pathname);
	return cached(event, key, async () => {
		let upstream: Response;
		try {
			upstream = await apiFetch(event, 'GET', '/v1/market/brief/export', null, {
				auth: 'public',
				query: {
					date: permalink.date,
					slot: permalink.slot,
					lang: urlLang(event.url),
					format: EXPORT_FILES[file],
					...pair
				},
				headers: { Accept: '*/*' },
				signal: AbortSignal.timeout(UPSTREAM_TIMEOUT)
			});
		} catch (err) {
			console.warn('brief export', file, err);
			return upstreamError('network');
		}
		if (upstream.status !== 200) {
			await upstream.body?.cancel().catch(() => {});
			return upstreamError(upstream.status);
		}
		return whitelisted(upstream);
	});
}
