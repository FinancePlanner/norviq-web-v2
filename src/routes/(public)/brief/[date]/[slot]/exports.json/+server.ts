import type { RequestHandler } from '@sveltejs/kit';
import { serveManifest } from '#lib/features/public/brief/exports.server.js';

// GET /brief/{date}/{slot}/exports.json: the export manifest, proxied and edge-cached.
export const GET: RequestHandler = (event) => serveManifest(event);
