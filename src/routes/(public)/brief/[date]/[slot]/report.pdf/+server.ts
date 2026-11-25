import type { RequestHandler } from '@sveltejs/kit';
import { serveExport } from '#lib/features/public/brief/exports.server.js';

// GET /brief/{date}/{slot}/report.pdf: the Go-rendered export, proxied and edge-cached.
export const GET: RequestHandler = (event) => serveExport(event, 'report.pdf');
