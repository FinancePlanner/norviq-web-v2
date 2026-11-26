import type { PageServerLoad } from './$types';
import { navContextFrom } from '#lib/nav/context.js';
import { domainIndex } from '#lib/nav/visible.js';

// /today … /community: every visible destination of one domain ("All in …" in
// the sidebar). The param matcher 404s anything that is not a domain key.
export const load: PageServerLoad = async (event) =>
	domainIndex(event.locals.t, navContextFrom(await event.parent()), event.params.domain);
