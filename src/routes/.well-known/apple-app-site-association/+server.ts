import type { RequestHandler } from '@sveltejs/kit';
import { appleAppSiteAssociationResponse } from '#lib/features/public/seo/seo.server.js';

// GET /.well-known/apple-app-site-association — Go appleAppSiteAssociationHandler (app_links.go).
export const GET: RequestHandler = () => appleAppSiteAssociationResponse();
