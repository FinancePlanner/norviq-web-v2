import type { RequestHandler } from '@sveltejs/kit';
import { serveBriefImage } from '#lib/features/public/brief/image.server.js';
import { OG } from '#lib/features/public/sharecard/sharecard.server.js';

// GET /brief/{date}/{slot}/og.png — Go MarketBriefHandler.OGImage.
export const GET: RequestHandler = (event) => serveBriefImage(event, 'og', OG);
