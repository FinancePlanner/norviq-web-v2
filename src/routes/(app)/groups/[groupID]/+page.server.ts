import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireGroups } from '#lib/features/social/gates.server.js';
import { getGroup, groupsFailure, groupsID, lastChannelKey } from '#lib/features/social/groups/groups.server.js';
import type { GroupDetail } from '#lib/features/social/groups/types.js';
import { card, chatHref, groupLanding, groupNotices, groupsError, withNotice } from '#lib/features/social/groups/view.js';

// GroupsOpen: a member lands in the channel they last had open; anyone else
// sees the public preview (a private group is a 404).
export const load: PageServerLoad = async (event) => {
	await requireGroups(event);
	const groupID = groupsID(event.params.groupID);
	let detail: GroupDetail;
	try {
		detail = await getGroup(event, groupID);
	} catch (err) {
		groupsFailure(err, event.url.pathname);
	}
	if (!detail.group.membership) {
		return { group: card(detail.group, new Date()), owner: detail.ownerUsername ?? '', error: groupsError(event.url) };
	}
	let target = groupLanding(detail);
	const last = event.locals.session.get<string>(lastChannelKey(groupID));
	if (last && (detail.channels ?? []).some((c) => c.id === last)) target = chatHref(groupID, last);
	const notice = event.url.searchParams.get('notice') ?? '';
	if (groupNotices[notice]) target = withNotice(target, notice);
	redirect(303, target);
};
