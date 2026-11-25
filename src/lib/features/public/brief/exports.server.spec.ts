import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock(
	'$app/env/private',
	() =>
		new Proxy<Record<string, string | undefined>>(
			{ PUBLIC_BASE_URL: 'https://www.norviq.org' },
			{
				has: () => true,
				get: (target, key) => (typeof key === 'string' ? target[key] : undefined)
			}
		)
);
vi.mock('#lib/server/api.js', () => ({ apiFetch: vi.fn<typeof apiFetchType>() }));

import type { RequestEvent } from '@sveltejs/kit';
import type { apiFetch as apiFetchType } from '#lib/server/api.js';
import { apiFetch } from '#lib/server/api.js';
import { serveExport, serveManifest, webManifest, type ExportFile } from './exports.server.js';

const mockFetch = vi.mocked(apiFetch);
const BYTES = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
const IMMUTABLE = 'public, max-age=31536000, immutable';

function upstream(extra: Record<string, string> = {}, status = 200): Response {
	return new Response(status === 200 ? BYTES : 'x', {
		status,
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': IMMUTABLE,
			ETag: '"abc"',
			'Content-Disposition': 'attachment; filename="brief.png"',
			...extra
		}
	});
}

function setup(
	file: ExportFile,
	query: string,
	opts: {
		caches?: boolean;
		headers?: Record<string, string>;
		accessToken?: string;
		path?: string;
	} = {}
) {
	const store = new Map<string, Response>();
	const matchRequests: Request[] = [];
	const put = vi.fn<(req: Request, res: Response) => Promise<void>>((req, res) => {
		store.set(req.url, res);
		return Promise.resolve();
	});
	const match = vi.fn<(req: Request) => Promise<Response | undefined>>((req) => {
		matchRequests.push(req);
		const hit = store.get(req.url);
		// A stored response with its own headers property is the immutable-headers fake: hand it back as is.
		return Promise.resolve(hit && Object.hasOwn(hit, 'headers') ? hit : hit?.clone());
	});
	const waits: Promise<unknown>[] = [];
	const path = opts.path ?? `/brief/2026-11-20/evening/${file}`;
	const url = new URL(`https://www.norviq.org${path}${query}`);
	const parts = path.split('/');
	const event = {
		url,
		request: new Request(url, { headers: opts.headers }),
		params: { date: decodeURIComponent(parts[2]), slot: decodeURIComponent(parts[3]) },
		locals: { session: { accessToken: opts.accessToken ?? '' } },
		platform:
			opts.caches === false
				? undefined
				: {
						caches: { default: { match, put } },
						ctx: { waitUntil: (p: Promise<unknown>) => waits.push(p) }
					}
	} as unknown as RequestEvent;
	return { event, store, put, match, matchRequests, waits, file };
}

async function run(s: ReturnType<typeof setup>) {
	const res = await serveExport(s.event, s.file);
	await Promise.all(s.waits);
	return res;
}

beforeEach(() => {
	mockFetch.mockReset();
});

describe('serveExport', () => {
	it('proxies a versioned social export and caches it', async () => {
		mockFetch.mockResolvedValue(upstream());
		const s = setup('social.png', '?lang=pt-PT&rev=2&v=1');
		const res = await run(s);
		expect(mockFetch).toHaveBeenCalledWith(s.event, 'GET', '/v1/market/brief/export', null, {
			auth: 'public',
			query: {
				date: '2026-11-20',
				slot: 'evening',
				lang: 'pt-PT',
				format: 'social',
				rev: 2,
				v: 1
			},
			headers: { Accept: '*/*' },
			signal: expect.any(AbortSignal)
		});
		expect(res.status).toBe(200);
		expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
		expect(res.headers.get('Cache-Control')).toBe(IMMUTABLE);
		expect(res.headers.get('ETag')).toBe('"abc"');
		expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="brief.png"');
		const key = 'https://www.norviq.org/brief/2026-11-20/evening/social.png?lang=pt-PT&rev=2&v=1';
		expect(s.put).toHaveBeenCalledTimes(1);
		expect(s.store.has(key)).toBe(true);
		expect(new Uint8Array(await s.store.get(key)!.arrayBuffer())).toEqual(BYTES);
	});

	it('serves a cache hit without calling the backend', async () => {
		mockFetch.mockResolvedValue(upstream());
		const s = setup('og.png', '');
		await run(s);
		mockFetch.mockClear();
		const again = setup('og.png', '');
		for (const [k, v] of s.store) again.store.set(k, v);
		const res = await run(again);
		expect(res.status).toBe(200);
		expect(mockFetch).not.toHaveBeenCalled();
		expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
	});

	it('returns a cache hit whose headers can be modified', async () => {
		const s = setup('og.png', '');
		const stored = new Response(BYTES, { status: 200, headers: { 'Content-Type': 'image/png' } });
		// workerd hands back cache.match responses with immutable headers.
		const frozen = new Headers(stored.headers);
		frozen.set = () => {
			throw new TypeError("Can't modify immutable headers.");
		};
		Object.defineProperty(stored, 'headers', { value: frozen });
		s.store.set('https://www.norviq.org/brief/2026-11-20/evening/og.png?lang=en', stored);
		const res = await run(s);
		expect(mockFetch).not.toHaveBeenCalled();
		expect(() => res.headers.set('X-Content-Type-Options', 'nosniff')).not.toThrow();
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toBe('image/png');
		expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
	});

	it('keys a percent-encoded or padded path on the canonical path', async () => {
		mockFetch.mockImplementation(() => Promise.resolve(upstream()));
		const s = setup('og.png', '', { path: '/brief/2026%2D11-20/%20evening/og.png' });
		await run(s);
		expect([...s.store.keys()]).toEqual([
			'https://www.norviq.org/brief/2026-11-20/evening/og.png?lang=en'
		]);
	});

	it('forwards rev and v only as a pair', async () => {
		mockFetch.mockImplementation(() => Promise.resolve(upstream()));
		const a = setup('og.png', '?rev=2');
		await run(a);
		expect(mockFetch.mock.calls[0][4]?.query).not.toHaveProperty('rev');
		expect(mockFetch.mock.calls[0][4]?.query).not.toHaveProperty('v');
		expect([...a.store.keys()]).toEqual([
			'https://www.norviq.org/brief/2026-11-20/evening/og.png?lang=en&rev=2'
		]);
		const b = setup('og.png', '?v=1');
		await run(b);
		expect(mockFetch.mock.calls[1][4]?.query).not.toHaveProperty('v');
		expect(mockFetch.mock.calls[1][4]?.query).not.toHaveProperty('rev');
		expect([...b.store.keys()]).toEqual([
			'https://www.norviq.org/brief/2026-11-20/evening/og.png?lang=en'
		]);
	});

	it('caps rev and v at 9999', async () => {
		mockFetch.mockImplementation(() => Promise.resolve(upstream()));
		const a = setup('og.png', '?rev=10000&v=1');
		await run(a);
		expect(mockFetch.mock.calls[0][4]?.query).not.toHaveProperty('rev');
		expect(mockFetch.mock.calls[0][4]?.query).not.toHaveProperty('v');
		expect([...a.store.keys()]).toEqual([
			'https://www.norviq.org/brief/2026-11-20/evening/og.png?lang=en'
		]);
		const b = setup('og.png', '?rev=9999&v=1');
		await run(b);
		expect(mockFetch.mock.calls[1][4]?.query).toMatchObject({ rev: 9999, v: 1 });
		expect([...b.store.keys()]).toEqual([
			'https://www.norviq.org/brief/2026-11-20/evening/og.png?lang=en&rev=9999&v=1'
		]);
	});

	it('normalises the cache key', async () => {
		mockFetch.mockImplementation(() => Promise.resolve(upstream()));
		const a = setup('og.png', '?rev=abc&x=1&utm_source=x');
		await run(a);
		expect([...a.store.keys()]).toEqual([
			'https://www.norviq.org/brief/2026-11-20/evening/og.png?lang=en'
		]);
		const q = mockFetch.mock.calls[0][4]?.query as Record<string, unknown>;
		expect(Object.keys(q).sort()).toEqual(['date', 'format', 'lang', 'slot']);
		const b = setup('og.png', '?lang=pt-PT&x=1');
		await run(b);
		expect([...b.store.keys()]).toEqual([
			'https://www.norviq.org/brief/2026-11-20/evening/og.png?lang=pt-PT'
		]);
	});

	it('maps card.png to the social format', async () => {
		mockFetch.mockResolvedValue(upstream());
		await run(setup('card.png', ''));
		expect(mockFetch.mock.calls[0][4]?.query).toMatchObject({ format: 'social' });
	});

	it('returns 404 for an invalid permalink without calling the backend', async () => {
		const res = await run(setup('og.png', '', { path: '/brief/2026-13-01/noon/og.png' }));
		expect(res.status).toBe(404);
		expect(res.headers.get('Content-Type')).toContain('text/plain');
		expect(res.headers.get('Cache-Control')).toBe('public, max-age=60');
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('passes a backend 404 on as a short-cached 404 and does not cache it', async () => {
		for (const status of [404, 400]) {
			mockFetch.mockResolvedValue(upstream({}, status));
			const s = setup('report.pdf', '');
			const res = await run(s);
			expect(res.status).toBe(404);
			expect(res.headers.get('Cache-Control')).toBe('public, max-age=60');
			expect(s.put).not.toHaveBeenCalled();
		}
	});

	it('turns backend 503, 500, a network error and a timeout into 503', async () => {
		const cases: Array<() => Promise<Response>> = [
			() => Promise.resolve(upstream({}, 503)),
			() => Promise.resolve(upstream({}, 500)),
			() => Promise.reject(new TypeError('network')),
			() => Promise.reject(new DOMException('timed out', 'TimeoutError'))
		];
		for (const c of cases) {
			mockFetch.mockImplementation(c);
			const s = setup('story.png', '');
			const res = await run(s);
			expect(res.status).toBe(503);
			expect(res.headers.get('Retry-After')).toBe('60');
			expect(res.headers.get('Cache-Control')).toBe('no-store');
			expect(s.put).not.toHaveBeenCalled();
		}
	});

	it('warns on every non-200 upstream status except 404', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		for (const status of [404, 400, 503]) {
			mockFetch.mockResolvedValue(upstream({}, status));
			await run(setup('story.png', ''));
		}
		expect(warn.mock.calls).toEqual([
			['brief export', 'story.png', 400],
			['brief export', 'story.png', 503]
		]);
		warn.mockRestore();
	});

	it('uses the public token for a signed-in viewer', async () => {
		mockFetch.mockResolvedValue(upstream());
		await run(setup('og.png', '', { accessToken: 'user-token' }));
		expect(mockFetch.mock.calls[0][4]?.auth).toBe('public');
	});

	it('caches only whitelisted headers', async () => {
		mockFetch.mockResolvedValue(upstream({ 'Set-Cookie': 'a=b', 'X-Debug': '1' }));
		const s = setup('og.png', '');
		const res = await run(s);
		const cached = [...s.store.values()][0];
		for (const r of [res, cached]) {
			expect(r.headers.get('Set-Cookie')).toBeNull();
			expect(r.headers.get('X-Debug')).toBeNull();
			expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff');
		}
	});

	it('looks up the cache with the client conditional headers', async () => {
		mockFetch.mockResolvedValue(upstream());
		const s = setup('og.png', '', {
			headers: { 'If-None-Match': '"abc"', Range: 'bytes=0-3' }
		});
		await run(s);
		expect(s.matchRequests[0].headers.get('If-None-Match')).toBe('"abc"');
		expect(s.matchRequests[0].headers.get('Range')).toBe('bytes=0-3');
		const fetchHeaders = mockFetch.mock.calls[0][4]?.headers ?? {};
		expect(fetchHeaders).not.toHaveProperty('If-None-Match');
		expect(fetchHeaders).not.toHaveProperty('Range');
	});

	it('works without platform caches', async () => {
		mockFetch.mockResolvedValue(upstream());
		const res = await run(setup('og.png', '', { caches: false }));
		expect(res.status).toBe(200);
		expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
	});
});

describe('X-Norviq-Edge-Cache', () => {
	const H = 'X-Norviq-Edge-Cache';

	it('says miss, then hit, and never stores the header', async () => {
		mockFetch.mockResolvedValue(upstream());
		const first = setup('og.png', '');
		const miss = await run(first);
		expect(miss.headers.get(H)).toBe('miss');
		expect([...first.store.values()][0].headers.get(H)).toBeNull();
		const again = setup('og.png', '');
		for (const [k, v] of first.store) again.store.set(k, v);
		const hit = await run(again);
		expect(hit.headers.get(H)).toBe('hit');
		expect([...again.store.values()][0].headers.get(H)).toBeNull();
	});

	it('says skip for a non-200 and off without an edge cache', async () => {
		mockFetch.mockResolvedValue(upstream({}, 404));
		expect((await run(setup('og.png', ''))).headers.get(H)).toBe('skip');
		mockFetch.mockResolvedValue(upstream());
		expect((await run(setup('og.png', '', { caches: false }))).headers.get(H)).toBe('off');
	});

	it('logs a failing put and still answers 200', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		mockFetch.mockResolvedValue(upstream());
		const s = setup('og.png', '');
		const boom = new Error('quota');
		s.put.mockRejectedValueOnce(boom);
		const res = await run(s);
		expect(res.status).toBe(200);
		expect(res.headers.get(H)).toBe('miss');
		expect(warn).toHaveBeenCalledWith(
			'brief export cache put failed',
			'https://www.norviq.org/brief/2026-11-20/evening/og.png?lang=en',
			boom
		);
		warn.mockRestore();
	});
});

const BACKEND_MANIFEST = {
	editionId: 'MI-2026-11-20-C',
	revision: 2,
	contentHash: 'ab',
	rendererVersion: 1,
	formats: [
		{ id: 'og', width: 1200, height: 630, mime: 'image/png', query: 'rev=2&v=1' },
		{ id: 'social', width: 1080, height: 1350, mime: 'image/png', query: 'rev=2&v=1' },
		{ id: 'story', width: 1080, height: 1920, mime: 'image/png', query: 'rev=2&v=1' },
		{ id: 'pdf', pages: 4, mime: 'application/pdf', query: 'rev=2&v=1' }
	]
};

function manifestResponse(body: unknown, status = 200): Response {
	return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('webManifest', () => {
	it('builds root-relative URLs', () => {
		const pt = webManifest(BACKEND_MANIFEST, '2026-11-20', 'evening', 'pt-PT');
		expect(pt?.formats[1].url).toBe('/brief/2026-11-20/evening/social.png?lang=pt-PT&rev=2&v=1');
		expect(pt?.formats[3]).toEqual({
			id: 'pdf',
			url: '/brief/2026-11-20/evening/report.pdf?lang=pt-PT&rev=2&v=1',
			pages: 4,
			mime: 'application/pdf'
		});
		const en = webManifest(BACKEND_MANIFEST, '2026-11-20', 'evening', 'en');
		expect(en?.formats[0].url).toBe('/brief/2026-11-20/evening/og.png?rev=2&v=1');
		expect(en).toMatchObject({ editionId: 'MI-2026-11-20-C', revision: 2, rendererVersion: 1 });
		expect(JSON.stringify(en)).not.toContain('contentHash');
	});

	it('drops unknown formats and unversions a bad query', () => {
		const m = webManifest(
			{
				...BACKEND_MANIFEST,
				formats: [
					{ id: 'gif', mime: 'image/gif', query: 'rev=2&v=1' },
					{ id: 'story', mime: 'image/png', query: 'rev=2&v=1&x=<script>' }
				]
			},
			'2026-11-20',
			'evening',
			'en'
		);
		expect(m?.formats).toEqual([
			{ id: 'story', url: '/brief/2026-11-20/evening/story.png', mime: 'image/png' }
		]);
	});

	it('rejects a malformed body', () => {
		expect(webManifest({}, '2026-11-20', 'evening', 'en')).toBeNull();
		expect(
			webManifest({ ...BACKEND_MANIFEST, formats: 'x' }, '2026-11-20', 'evening', 'en')
		).toBeNull();
		expect(
			webManifest({ ...BACKEND_MANIFEST, revision: '2' }, '2026-11-20', 'evening', 'en')
		).toBeNull();
		expect(webManifest(null, '2026-11-20', 'evening', 'en')).toBeNull();
	});
});

describe('serveManifest', () => {
	it('serves exports.json with a five-minute cache', async () => {
		mockFetch.mockResolvedValue(manifestResponse(BACKEND_MANIFEST));
		const s = setup('og.png', '?lang=pt-PT', { path: '/brief/2026-11-20/evening/exports.json' });
		const res = await serveManifest(s.event);
		await Promise.all(s.waits);
		expect(mockFetch).toHaveBeenCalledWith(s.event, 'GET', '/v1/market/brief/exports', null, {
			auth: 'public',
			query: { date: '2026-11-20', slot: 'evening', lang: 'pt-PT' },
			signal: expect.any(AbortSignal)
		});
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
		expect(res.headers.get('Cache-Control')).toBe('public, max-age=300');
		expect(await res.json()).toEqual(
			webManifest(BACKEND_MANIFEST, '2026-11-20', 'evening', 'pt-PT')
		);
		expect(
			s.store.has('https://www.norviq.org/brief/2026-11-20/evening/exports.json?lang=pt-PT')
		).toBe(true);
	});

	it('maps exports.json errors like the files', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const path = '/brief/2026-11-20/evening/exports.json';
		mockFetch.mockResolvedValue(manifestResponse('no', 404));
		let res = await serveManifest(setup('og.png', '', { path }).event);
		expect(res.status).toBe(404);
		expect(res.headers.get('Cache-Control')).toBe('public, max-age=60');
		mockFetch.mockResolvedValue(manifestResponse('busy', 503));
		res = await serveManifest(setup('og.png', '', { path }).event);
		expect(res.status).toBe(503);
		expect(res.headers.get('Retry-After')).toBe('60');
		mockFetch.mockResolvedValue(manifestResponse({ nope: true }));
		const s = setup('og.png', '', { path });
		res = await serveManifest(s.event);
		await Promise.all(s.waits);
		expect(res.status).toBe(503);
		expect(s.put).not.toHaveBeenCalled();
		expect(warn.mock.calls).toEqual([
			['brief export', 'exports.json', 503],
			['brief export', 'exports.json', 200]
		]);
		warn.mockRestore();
	});
});
