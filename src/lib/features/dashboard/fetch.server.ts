import type { RequestEvent } from '@sveltejs/kit';
import { apiFetch, type RawOptions } from '#lib/server/api.js';

// The Go handlers call the generated client as
//
//	resp, err := client.XWithResponse(ctx, …)
//	if err != nil { vm.LoadErrors["x"] = true }   // transport failure only
//	if resp.JSON200 != nil { … }                  // a non-200 is just "no data"
//
// so a 4xx/5xx from the backend is NOT a load error, only a missing payload.
// `fetchJSON` keeps that distinction: `failed` is true only when the request
// itself (or JSON decoding) failed; `data` is null for any non-200.

export interface Fetched<T> {
	data: T | null;
	status: number;
	failed: boolean;
}

export async function fetchJSON<T>(
	event: RequestEvent,
	method: string,
	path: string,
	input?: unknown,
	opts: RawOptions = {}
): Promise<Fetched<T>> {
	try {
		const headers = { ...(opts.headers ?? {}) };
		let body: string | undefined;
		if (input !== undefined) {
			body = JSON.stringify(input);
			headers['Content-Type'] = 'application/json';
		}
		const res = await apiFetch(event, method, path, body, { ...opts, headers });
		if (res.status !== 200) {
			await res.body?.cancel().catch(() => {});
			return { data: null, status: res.status, failed: false };
		}
		const text = await res.text();
		return {
			data: (text ? JSON.parse(text) : null) as T | null,
			status: res.status,
			failed: false
		};
	} catch (err) {
		console.warn('backend fetch failed', method, path, err);
		return { data: null, status: 0, failed: true };
	}
}

export const getJSON = <T>(event: RequestEvent, path: string, query?: RawOptions['query']) =>
	fetchJSON<T>(event, 'GET', path, undefined, { query });
