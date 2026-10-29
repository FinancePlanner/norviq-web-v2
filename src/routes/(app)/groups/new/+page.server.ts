import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { groupsPublicOn, requireGroups } from '#lib/features/social/gates.server.js';
import {
	boardsErrorText,
	createGroup,
	groupsFailure,
	groupsRedirectError,
	isServerFailure,
	readForm
} from '#lib/features/social/groups/groups.server.js';
import { groupLanding, groupsError, topicAllowsTicker, withNotice } from '#lib/features/social/groups/view.js';
import type { CreateGroupRequest, GroupDetail, GroupForm } from '#lib/features/social/groups/types.js';

// GroupsNew / GroupsCreate (norviq-web internal/handlers/groups.go).
export const load: PageServerLoad = async (event) => {
	const cfg = await requireGroups(event);
	const q = event.url.searchParams;
	const form: GroupForm = { name: '', description: '', emoji: '', topic: q.get('topic') ?? '', ticker: q.get('ticker') ?? '', visibility: '' };
	return { form, error: groupsError(event.url), publicAllowed: groupsPublicOn(cfg) };
};

const optional = (v: string) => (v.trim() === '' ? undefined : v.trim());

export const actions: Actions = {
	default: async (event) => {
		const cfg = await requireGroups(event);
		const data = await readForm(event);
		const value = (k: string) => String(data.get(k) ?? '');
		const form: GroupForm = {
			name: value('name').trim(),
			description: value('description').trim(),
			emoji: value('emoji').trim(),
			topic: value('topic'),
			ticker: value('ticker').trim(),
			visibility: value('visibility') === 'public' ? 'public' : 'private'
		};
		const request: CreateGroupRequest = {
			name: form.name,
			description: optional(form.description),
			iconEmoji: optional(form.emoji),
			topic: form.topic,
			visibility: form.visibility
		};
		if (topicAllowsTicker(form.topic)) request.ticker = optional(form.ticker);
		let detail: GroupDetail;
		try {
			detail = await createGroup(event, request);
		} catch (err) {
			const code = (err as { code?: string }).code;
			if (code === 'guidelines_required' || code === 'community_banned') groupsRedirectError(err, '/groups/new', event.url.pathname);
			if (isServerFailure(err)) groupsFailure(err, event.url.pathname);
			return fail(422, { form, error: boardsErrorText(err), publicAllowed: groupsPublicOn(cfg) });
		}
		redirect(303, withNotice(groupLanding(detail), 'created'));
	}
};
