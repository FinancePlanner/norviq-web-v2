// MarketBriefHandler.serveImage / briefCard (market_brief_page.go):
// /brief/{date}/{slot}/og.png (1200×630) and card.png (1080×1350).
import type { RequestEvent } from '@sveltejs/kit';
import { config } from '#lib/server/env.js';
import { translator } from '#lib/i18n/index.js';
import { Down, Flat, Up, cachedImage, regionCode, renderBrief, type BriefCard, type Format } from '../sharecard/sharecard.server.js';
import { marketBriefTitleKey, Down as VMDown, Up as VMUp } from '#lib/features/dashboard/market-brief/types.js';
import { BriefNotFound, BriefUnavailable, IMAGE_CACHE_CONTROL, briefPath, findBrief, itemTexts, parsePermalink, shortHost, urlLang } from './brief.server.js';

export async function serveBriefImage(event: RequestEvent, kind: 'og' | 'card', format: Format): Promise<Response> {
	const lang = urlLang(event.url);
	const key = parsePermalink(event.params.date ?? '', event.params.slot ?? '');
	if (!key) return new Response('404 page not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
	let png: Uint8Array;
	try {
		png = await cachedImage(`${kind}|${lang}|${key.date}|${key.slot}`, async () => {
			const brief = await findBrief(event, { lang, ...key });
			const t = translator(lang);
			const card: BriefCard = {
				title: t(marketBriefTitleKey(brief.slot)),
				date: brief.tradingDate,
				items: itemTexts(brief, 3),
				shortURL: shortHost(config().publicBaseURL) + briefPath(brief.tradingDateISO, brief.slot),
				disclaimer: t('AI-written from market data. Not financial advice.'),
				rows: brief.groups.flatMap((g) =>
					g.rows.map((r) => ({
						region: regionCode(r.flag),
						name: r.name,
						level: r.level,
						change: r.change,
						direction: r.direction === VMUp ? Up : r.direction === VMDown ? Down : Flat
					}))
				)
			};
			return renderBrief(card, format);
		});
	} catch (err) {
		if (err instanceof BriefNotFound) return new Response('404 page not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
		if (err instanceof BriefUnavailable) {
			return new Response('Temporarily unavailable\n', { status: 503, headers: { 'Retry-After': '60', 'Content-Type': 'text/plain; charset=utf-8' } });
		}
		console.error('render market brief image', kind, err);
		return new Response('Failed to render image\n', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
	}
	return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': IMAGE_CACHE_CONTROL } });
}
