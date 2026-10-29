import type { RequestHandler } from '@sveltejs/kit';
import { appleAppSiteAssociationResponse } from '#lib/features/public/seo/seo.server.js';

// GET /apple-app-site-association — same file at the legacy root path (app_links.go).
export const GET: RequestHandler = () => appleAppSiteAssociationResponse();
