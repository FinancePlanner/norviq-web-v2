import type { RequestHandler } from '@sveltejs/kit';
import { serveArticleImage } from '#lib/features/public/articles/image.server.js';
import { Instagram } from '#lib/features/public/sharecard/sharecard.server.js';

// GET /articles/{code}/card.png — Go ArticlesHandler.CardImage.
export const GET: RequestHandler = (event) => serveArticleImage(event, 'card', Instagram);
