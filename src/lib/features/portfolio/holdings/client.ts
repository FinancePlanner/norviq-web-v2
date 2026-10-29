// Browser side of the holdings position endpoints: what hx-get / hx-post /
// hx-put / hx-delete did. A 2xx answer is a PositionActionResult; anything
// else is dropped, as the Go app's htmx config dropped 4xx/5xx (noSwap).

import type { PositionActionResult } from './types.js';

export async function positionAction(
	url: string,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
	form?: HTMLFormElement
): Promise<PositionActionResult | null> {
	const init: RequestInit = { method, headers: { accept: 'application/json' } };
	if (form) {
		// htmx sent non-multipart forms url-encoded.
		const body = new URLSearchParams();
		for (const [k, v] of new FormData(form)) if (typeof v === 'string') body.append(k, v);
		init.body = body;
		(init.headers as Record<string, string>)['content-type'] = 'application/x-www-form-urlencoded';
	}
	// The .htmx-request spinner CSS keys off the form while the request runs.
	form?.classList.add('htmx-request');
	try {
		const res = await fetch(url, init);
		if (!res.ok) return null;
		return (await res.json()) as PositionActionResult;
	} catch {
		return null;
	} finally {
		form?.classList.remove('htmx-request');
	}
}

/** positionActionURL: ?range= only when it is not the 1M default. */
export function positionActionURL(path: string, rangeKey: string): string {
	return rangeKey === '' || rangeKey === '1M' ? path : `${path}?range=${rangeKey}`;
}

/** alertRangeQuery */
export function alertRangeQuery(rangeKey: string): string {
	return rangeKey === '' || rangeKey === '1M' ? '' : `?range=${rangeKey}`;
}
