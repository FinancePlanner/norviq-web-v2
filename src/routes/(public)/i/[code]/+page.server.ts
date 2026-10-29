import type { PageServerLoad } from './$types';
import { loadInvite } from '#lib/features/public/invite/invite.server.js';

// GET /i/{code} — handlers.PublicInvite (router.With(attachSocialConfig)).
export const load: PageServerLoad = async (event) => ({ vm: await loadInvite(event) });
