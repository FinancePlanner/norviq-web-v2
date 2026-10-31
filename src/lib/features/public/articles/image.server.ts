// ArticlesHandler.serveCard (handlers/articles.go): /articles/{code}/og.png
// and card.png, drawn by the sharecard port. Read with the public token.
import { error, type RequestEvent } from '@sveltejs/kit';
import { cachedImage, render, type Format } from '../sharecard/sharecard.server.js';
import { base, detailFailed, getArticle, requireArticles } from './articles.server.js';
import { goShortDate, parseSlugCode } from './articles.js';

export async function serveArticleImage(
	event: RequestEvent,
	kind: 'og' | 'card',
	format: Format
): Promise<Response> {
	await requireArticles(event);
	const code = parseSlugCode(event.params.code ?? '');
	if (!code) error(404, 'Not Found');
	let png: Uint8Array;
	try {
		png = await cachedImage(`article|${kind}:${code}`, async () => {
			const a = (await getArticle(event, code, 'public')).article;
			const short =
				base()
					.replace(/^https:\/\//, '')
					.replace(/^www\./, '') +
				'/a/' +
				a.code;
			return render(
				{
					title: a.title,
					tickers: a.tickers ?? [],
					bullets: a.bulletPoints ?? [],
					author: a.author.username ? '@' + a.author.username : '',
					date: goShortDate(a.publishedAt),
					shortURL: short
				},
				format
			);
		});
	} catch (err) {
		detailFailed(event.url.pathname, err);
	}
	return new Response(png as BodyInit, {
		headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=0, s-maxage=3600' }
	});
}
