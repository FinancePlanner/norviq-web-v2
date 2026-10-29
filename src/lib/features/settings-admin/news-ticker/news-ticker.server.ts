import type { RequestEvent } from '@sveltejs/kit';
import { apiFetch, apiJSON } from '#lib/server/api.js';

// Port of the norviq-web internal/api/newsticker client calls the settings
// page makes, and LoadNewsTickerSettingsVM (settings_news_ticker.go).
// TODO(dedupe): the dashboard ticker port talks to the same /v1/news/ticker API.

export interface NewsTickerFeedRow {
	id: string;
	url: string;
	title: string;
}

export interface NewsTickerViewModel {
	enabled: boolean;
	configured: boolean;
	feeds: NewsTickerFeedRow[];
	maxFeeds: number;
	errorMessage: string;
}

interface NewsTickerFeedsResponse {
	feeds?: { id: string; title?: string | null; url: string }[] | null;
	maxFeeds: number;
}

// Go built this client with a 15s HTTP timeout.
const timeout = () => AbortSignal.timeout(15_000);

/** A 503 from the backend means the ticker is not configured there; the page says so. */
export async function loadNewsTickerSettingsVM(event: RequestEvent): Promise<NewsTickerViewModel> {
	const vm: NewsTickerViewModel = { enabled: false, configured: false, feeds: [], maxFeeds: 0, errorMessage: '' };
	try {
		const st = await apiJSON<{ enabled: boolean }>(event, 'GET', '/v1/news/ticker/settings', undefined, { signal: timeout() });
		vm.enabled = !!st?.enabled;
	} catch (err) {
		console.warn('load news ticker settings', err);
		vm.errorMessage = 'News ticker settings are unavailable right now.';
		return vm;
	}
	let feeds: NewsTickerFeedsResponse;
	try {
		feeds = await apiJSON<NewsTickerFeedsResponse>(event, 'GET', '/v1/news/ticker/feeds', undefined, { signal: timeout() });
	} catch (err) {
		console.warn('load news ticker feeds', err);
		vm.errorMessage = 'Your feeds are unavailable right now.';
		return vm;
	}
	vm.configured = (feeds?.maxFeeds ?? 0) > 0;
	vm.maxFeeds = feeds?.maxFeeds ?? 0;
	vm.feeds = (feeds?.feeds ?? []).map((f) => ({ id: f.id, url: f.url, title: f.title ?? '' }));
	return vm;
}

/** PUT /v1/news/ticker/settings; throws unless the backend answers 200. */
export async function updateNewsTickerSettings(event: RequestEvent, enabled: boolean): Promise<void> {
	await apiJSON(event, 'PUT', '/v1/news/ticker/settings', { enabled }, { signal: timeout() });
}

/** POST /v1/news/ticker/feeds; returns the status (Go switched on it). Throws on a transport error. */
export async function addNewsTickerFeed(event: RequestEvent, url: string): Promise<number> {
	const res = await apiFetch(event, 'POST', '/v1/news/ticker/feeds', JSON.stringify({ url }), {
		headers: { 'Content-Type': 'application/json' },
		signal: timeout()
	});
	await res.body?.cancel();
	return res.status;
}

/** DELETE /v1/news/ticker/feeds/{feedId}; returns the status. Throws on a transport error. */
export async function deleteNewsTickerFeed(event: RequestEvent, id: string): Promise<number> {
	const res = await apiFetch(event, 'DELETE', '/v1/news/ticker/feeds/' + encodeURIComponent(id), null, { signal: timeout() });
	await res.body?.cancel();
	return res.status;
}
