import type { RequestHandler } from '@sveltejs/kit';
import { serveArticleImage } from '#lib/features/public/articles/image.server.js';
import { OG } from '#lib/features/public/sharecard/sharecard.server.js';

// GET /articles/{code}/og.png — Go ArticlesHandler.OGImage.
export const GET: RequestHandler = (event) => serveArticleImage(event, 'og', OG);
