// Port of norviq-web internal/handlers/market_headlines.go helpers and the
// news ticker mapping (news_ticker.go LoadNewsTicker). Pure, so the browser
// can map the polled /v1/news/ticker response too.

import type { components } from '#lib/api/schema.js';
import { goFormat } from '../shared.js';
import type { HeadlineVM } from './types.js';

/** headlineSource: the URL host without "www.". */
export function headlineSource(rawURL: string): string {
	try {
		return new URL(rawURL).host.replace(/^www\./, '');
	} catch {
		return '';
	}
}

function parseHeadlineDate(raw: string): Date | null {
	const s = raw.trim();
	let m: RegExpMatchArray | null;
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(s)) {
		const d = new Date(s);
		return Number.isNaN(d.getTime()) ? null : d;
	}
	if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/))) {
		return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
	}
	if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
	return null;
}

/** headlineTimeAgo: coarse relative time; unparseable dates hide the timestamp. */
export function headlineTimeAgo(raw: string | null | undefined, now: Date): string {
	if (!raw || !raw.trim()) return '';
	const parsed = parseHeadlineDate(raw);
	if (!parsed) return '';
	const elapsed = now.getTime() - parsed.getTime();
	const m = 60_000;
	const h = 60 * m;
	if (elapsed < m) return 'just now';
	if (elapsed < h) return `${Math.trunc(elapsed / m)}m ago`;
	if (elapsed < 24 * h) return `${Math.trunc(elapsed / h)}h ago`;
	if (elapsed < 7 * 24 * h) return `${Math.trunc(elapsed / (24 * h))}d ago`;
	return goFormat(parsed, '2 Jan');
}

export interface NewsTickerVM {
	enabled: boolean;
	stale: boolean;
	items: HeadlineVM[];
}

/** LoadNewsTicker's mapping. Items without a link are dropped. */
export function mapNewsTicker(resp: components['schemas']['NewsTickerResponse'], now = new Date()): NewsTickerVM {
	const vm: NewsTickerVM = { enabled: resp.enabled, stale: resp.stale, items: [] };
	for (const item of resp.items ?? []) {
		const title = (item.title ?? '').trim();
		if (!title || !item.url || !item.url.trim()) continue;
		const published = new Date(item.publishedAt);
		vm.items.push({
			title,
			url: item.url,
			source: (item.source ?? '').trim(),
			timeAgo: Number.isNaN(published.getTime()) ? '' : headlineTimeAgo(published.toISOString().replace(/\.\d{3}Z$/, 'Z'), now)
		});
	}
	return vm;
}
