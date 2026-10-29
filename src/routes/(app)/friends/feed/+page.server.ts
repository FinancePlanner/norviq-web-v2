import type { PageServerLoad } from './$types';
import { requireActivityFeed } from '#lib/features/social/gates.server.js';
import { loadFeed } from '#lib/features/social/friends/feed.server.js';

// Port of handlers.Feed (full page). The htmx load-more is +server.ts GET.
export const load: PageServerLoad = async (event) => {
	await requireActivityFeed(event);
	const vm = await loadFeed(event, false);
	return {
		...vm,
		notice: event.url.searchParams.get('notice') ?? '',
		errorMessage: event.url.searchParams.get('error') || vm.errorMessage
	};
};
