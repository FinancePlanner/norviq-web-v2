import type { RequestHandler } from '@sveltejs/kit';
import { serveExport } from '#lib/features/public/brief/exports.server.js';

// GET /brief/{date}/{slot}/og.png: the Go-rendered export, proxied and edge-cached.
export const GET: RequestHandler = (event) => serveExport(event, 'og.png');
