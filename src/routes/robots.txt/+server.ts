import type { RequestHandler } from '@sveltejs/kit';
import { robotsTxt } from '#lib/features/public/seo/seo.server.js';

// GET /robots.txt — Go robotsHandler (internal/server/seo.go).
export const GET: RequestHandler = () => robotsTxt();
