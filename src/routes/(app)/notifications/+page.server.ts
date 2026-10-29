import type { PageServerLoad } from './$types';
import { api } from '#lib/server/api.js';
import { notificationWebLink, type InboxVM } from '#lib/features/dashboard/notifications/inbox.js';
import { queryEscape } from '#lib/sharelinks.js';

// GET /notifications → NotificationInbox (norviq-web
// internal/handlers/wealth_automation.go). No feature gate in server.go.
export const load: PageServerLoad = async (event) => {
	const vm: InboxVM = { page: { items: [], unreadCount: 0 }, items: [], nextURL: '', error: '' };
	const query: { cursor?: string } = {};
	const rawCursor = event.url.searchParams.get('cursor') ?? '';
	if (rawCursor !== '') query.cursor = rawCursor;
	try {
		const res = await api(event).GET('/v1/notifications/inbox', { params: { query } });
		if (res.response.status !== 200 || !res.data) throw new Error('inbox');
		vm.page = res.data;
		vm.items = (vm.page.items ?? []).map((item) => ({ item, webLink: notificationWebLink(item) }));
		if (vm.page.nextCursor != null) vm.nextURL = '/notifications?cursor=' + queryEscape(vm.page.nextCursor);
	} catch {
		vm.error = 'Could not load notifications.';
	}
	return { vm };
};
