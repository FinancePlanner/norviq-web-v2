import type { PageServerLoad } from './$types';
import { loadGroupInvite } from '#lib/features/public/invite/invite.server.js';

// GET /g/{code} — handlers.PublicGroupInvite (router.With(attachSocialConfig)).
export const load: PageServerLoad = async (event) => ({ vm: await loadGroupInvite(event) });
