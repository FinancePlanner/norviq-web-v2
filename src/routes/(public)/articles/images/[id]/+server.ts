import { error, type RequestHandler } from '@sveltejs/kit';
import { APIError } from '#lib/server/api.js';
import { uuidPattern } from '#lib/features/public/articles/articles.js';
import {
	ARTICLE_COVER_CACHE_CONTROL,
	fetchArticleImage,
	requireArticles
} from '#lib/features/public/articles/articles.server.js';

// GET /articles/images/{id} → ArticlesHandler.Image: proxies a cover with the
// public token. Only PNG, JPEG and WebP are served, as their bare media type,
// nosniff.
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 3 << 20;

export const GET: RequestHandler = async (event) => {
	await requireArticles(event);
	const id = event.params.id ?? '';
	if (!uuidPattern.test(id)) error(404, 'Not Found');
	let res: Response;
	try {
		res = await fetchArticleImage(event, id);
	} catch (err) {
		if (err instanceof APIError && err.status === 404) error(404, 'Not Found');
		console.error('fetch article image', id, err);
		error(502, 'Image unavailable');
	}
	const contentType = res.headers.get('content-type') ?? '';
	let data: ArrayBuffer;
	try {
		data = (await res.arrayBuffer()).slice(0, MAX_BYTES);
	} catch (err) {
		console.error('fetch article image', id, err);
		error(502, 'Image unavailable');
	}
	// Parsed, not compared: "image/jpeg; charset=binary" is a JPEG.
	const mediaType = contentType.split(';')[0].trim().toLowerCase();
	if (!IMAGE_TYPES.has(mediaType)) {
		console.warn('article image has a disallowed content type', id, contentType);
		error(404, 'Not Found');
	}
	return new Response(data, {
		headers: {
			'Content-Type': mediaType,
			'X-Content-Type-Options': 'nosniff',
			'Cache-Control': ARTICLE_COVER_CACHE_CONTROL
		}
	});
};
