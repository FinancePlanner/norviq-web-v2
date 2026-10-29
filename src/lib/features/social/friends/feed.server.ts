import type { RequestEvent } from '@sveltejs/kit';
import { achievementsDo, socialErrorMessage } from './friends.server.js';
import type { SocialFeedItem, SocialFeedResponse } from './types.js';

export interface FeedVM {
	items: SocialFeedItem[];
	nextCursor: string;
	errorMessage: string;
	/** A load-more that errored: nextCursor is the cursor that failed. */
	loadMoreFailed: boolean;
}

/** handlers.Feed: friends' unlocks, newest first, from ?cursor=. */
export async function loadFeed(event: RequestEvent, partial: boolean): Promise<FeedVM> {
	const vm: FeedVM = { items: [], nextCursor: '', errorMessage: '', loadMoreFailed: false };
	let path = '/v1/social/feed';
	let cursor = event.url.searchParams.get('cursor') ?? '';
	if (cursor !== '' && cursor.length <= 256) path += '?' + new URLSearchParams({ cursor });
	else cursor = '';
	try {
		const feed = await achievementsDo<SocialFeedResponse>(event, 'GET', path);
		vm.items = feed?.items ?? [];
		vm.nextCursor = feed?.nextCursor ?? '';
	} catch (err) {
		vm.errorMessage = socialErrorMessage(err, 'Could not load the activity feed.');
		if (partial && cursor !== '') {
			// A failed load-more keeps the control on the same cursor so the
			// user can retry, instead of dropping it and ending the feed.
			vm.nextCursor = cursor;
			vm.loadMoreFailed = true;
		}
	}
	return vm;
}
