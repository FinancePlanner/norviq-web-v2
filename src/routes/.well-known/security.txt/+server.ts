import type { RequestHandler } from '@sveltejs/kit';
import { securityTxt } from '#lib/features/public/seo/seo.server.js';

// GET /.well-known/security.txt — Go securityTxtHandler (internal/server/security_txt.go).
export const GET: RequestHandler = () => securityTxt();
