import type { PageServerLoad } from './$types';
import { navContextFrom } from '#lib/nav/context.js';
import { moreIndex } from '#lib/nav/visible.js';

// The mobile bottom bar's More tab: Intelligence, Community and Account.
export const load: PageServerLoad = async (event) =>
	moreIndex(event.locals.t, navContextFrom(await event.parent()));
