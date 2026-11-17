// The stock page's three hx-get modal fragments (position actions are the
// portfolio feature's): earnings transcript and valuation form. Each opener
// shows the dialog at once (data-tui-dialog-trigger) and swaps the panel when
// the fragment answers; a failed answer leaves the previous panel, as htmx
// does not swap 4xx/5xx.

import { openDialog, closeDialog } from '#lib/components/norviq/tui/dialog/index.js';
import type { TranscriptViewModel, ValuationResult } from './detail.js';

export const panels = $state<{
	transcript: TranscriptViewModel | null;
	valuation: ValuationResult | null;
}>({
	transcript: null,
	valuation: null
});

async function getJSON<T>(url: string, init?: RequestInit): Promise<T | null> {
	try {
		// Headers, not an object spread: init.headers may be a Headers or a list of pairs.
		const headers = new Headers(init?.headers);
		if (!headers.has('accept')) headers.set('accept', 'application/json');
		const res = await fetch(url, { ...init, headers });
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

export async function openTranscript(symbol: string, dateISO: string) {
	openDialog('transcript-dialog');
	const vm = await getJSON<TranscriptViewModel>(
		`/portfolio/${symbol.toLowerCase()}/earnings/transcript?date=${dateISO}`
	);
	if (vm) panels.transcript = vm;
}

export async function openValuation(symbol: string) {
	openDialog('valuation-action-dialog');
	const result = await getJSON<ValuationResult>(`/portfolio/${symbol}/valuation/edit`);
	if (result) panels.valuation = result;
}

/** POST /portfolio/{symbol}/valuation; the result replaces the panel or redirects. */
export async function submitValuation(
	form: HTMLFormElement,
	symbol: string
): Promise<ValuationResult | null> {
	const body = new URLSearchParams();
	for (const [k, v] of new FormData(form)) if (typeof v === 'string') body.append(k, v);
	form.classList.add('htmx-request');
	try {
		const result = await getJSON<ValuationResult>(`/portfolio/${symbol}/valuation`, {
			method: 'POST',
			body,
			headers: { 'content-type': 'application/x-www-form-urlencoded' }
		});
		if (result && !('redirect' in result)) panels.valuation = result;
		if (result && 'redirect' in result) closeDialog('valuation-action-dialog');
		return result;
	} finally {
		form.classList.remove('htmx-request');
	}
}
