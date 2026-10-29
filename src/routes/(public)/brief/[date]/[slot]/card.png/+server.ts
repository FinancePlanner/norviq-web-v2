import type { RequestHandler } from '@sveltejs/kit';
import { serveBriefImage } from '#lib/features/public/brief/image.server.js';
import { Instagram } from '#lib/features/public/sharecard/sharecard.server.js';

// GET /brief/{date}/{slot}/card.png — Go MarketBriefHandler.CardImage.
export const GET: RequestHandler = (event) => serveBriefImage(event, 'card', Instagram);
