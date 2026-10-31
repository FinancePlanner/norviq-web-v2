import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActivityFeed } from '#lib/features/social/gates.server.js';
import { uuidParam } from '#lib/features/settings-admin/social/social.server.js';
import {
	isFetch,
	isNotFound,
	respondRedirect,
	socialDo,
	socialErrorMessage
} from '#lib/features/social/friends/friends.server.js';
import type { CongratsVM } from '#lib/features/social/friends/types.js';

// POST /friends/feed/{activityId}/congrats (handlers.FeedCongrats). The form
// carries the count the row showed so the replacement can say count+1
// without another fetch; a row the viewer already cheered keeps its count.
export const POST: RequestHandler = async (event) => {
	await requireActivityFeed(event);
	const activityID = uuidParam(event.params.activityId);
	if (!activityID) error(400, 'Invalid activity');
	const form = await event.request.formData();
	const rawCount = String(form.get('count') ?? '');
	const count = /^[+-]?\d+$/.test(rawCount) ? Math.max(Number(rawCount), 0) : 0; // strconv.Atoi, errors → 0
	const already = String(form.get('congratulated') ?? '') === '1';
	let err: unknown = null;
	try {
		await socialDo(event, 'POST', '/v1/social/feed/' + activityID + '/congrats');
	} catch (e) {
		err = e;
	}
	if (isFetch(event)) {
		// Keep the row's own id spelling so the DOM id stays stable.
		const vm: CongratsVM = { id: event.params.activityId, count, done: false };
		if (!err) {
			vm.done = true;
			if (!already) vm.count++;
		} else if (isNotFound(err)) {
			vm.gone = true;
		} else {
			vm.errorMessage = socialErrorMessage(err, 'Could not send your cheer.');
		}
		return json(vm);
	}
	if (!err) return respondRedirect(event, '/friends/feed', 'Cheered!', '');
	if (isNotFound(err))
		return respondRedirect(event, '/friends/feed', '', 'That activity is no longer available.');
	return respondRedirect(
		event,
		'/friends/feed',
		'',
		socialErrorMessage(err, 'Could not send your cheer.')
	);
};
