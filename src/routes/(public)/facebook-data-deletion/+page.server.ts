import type { PageServerLoad } from './$types';
import { loadLegal } from '#lib/features/public/legal/load.server.js';

// GET /facebook-data-deletion — Go legalHandler (internal/handlers/legal.go).
export const load: PageServerLoad = ({ url }) => loadLegal('facebook', url.pathname);
