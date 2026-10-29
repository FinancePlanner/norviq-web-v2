import type { RequestHandler } from '@sveltejs/kit';
import { llmsTxt } from '#lib/features/public/seo/seo.server.js';

// GET /llms.txt — Go llmsTxtHandler (internal/server/seo.go).
export const GET: RequestHandler = (event) => llmsTxt(event);
