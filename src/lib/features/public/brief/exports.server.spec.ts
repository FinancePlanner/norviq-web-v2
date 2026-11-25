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
import { serveExport, type ExportFile } from './exports.server.js';

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
		return Promise.resolve(store.get(req.url)?.clone());
	});
	const waits: Promise<unknown>[] = [];
	const path = opts.path ?? `/brief/2026-11-20/evening/${file}`;
	const url = new URL(`https://www.norviq.org${path}${query}`);
	const parts = path.split('/');
	const event = {
		url,
		request: new Request(url, { headers: opts.headers }),
		params: { date: parts[2], slot: parts[3] },
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
		again.store.set(
			'https://www.norviq.org/brief/2026-11-20/evening/og.png?lang=en',
			new Response(BYTES, { headers: { 'Content-Type': 'image/png' } })
		);
		const res = await run(again);
		expect(res.status).toBe(200);
		expect(mockFetch).not.toHaveBeenCalled();
		expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
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
