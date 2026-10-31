// Port of the notification-inbox parts of norviq-web
// internal/handlers/wealth_automation.go (NotificationInbox, notificationWebLink)
// and internal/pages/automation/page.templ (InboxVM, InboxItemVM).
import type { components } from '#lib/api/schema.js';
import { queryEscape } from '#lib/sharelinks.js';

export type NotificationInboxPage = components['schemas']['NotificationInboxPage'];
export type NotificationInboxItem = components['schemas']['NotificationInboxItem'];

/** automation.InboxItemVM */
export interface InboxItemVM {
	item: NotificationInboxItem;
	webLink: string;
}

/** automation.InboxVM */
export interface InboxVM {
	page: NotificationInboxPage;
	items: InboxItemVM[];
	nextURL: string;
	error: string;
}

/**
 * Go's url.PathEscape: like QueryEscape, but a space is "%20" and the path
 * sub-delimiters $ & + : = @ stay literal.
 */
function pathEscape(s: string): string {
	return queryEscape(s)
		.replaceAll('+', '%20')
		.replace(/%(24|26|2B|3A|3D|40)/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

/** notificationWebLink: the in-app page an inbox item's "Review" link opens. */
export function notificationWebLink(item: NotificationInboxItem): string {
	const payload = item.payload ?? {};
	switch (item.kind) {
		case 'watchlist_screen':
			if (payload.screen_id) return '/portfolio/screens?history=' + queryEscape(payload.screen_id);
			break;
		case 'rebalancing':
			if (payload.portfolio_list_id)
				return '/portfolio/rebalancing-rules?portfolio=' + queryEscape(payload.portfolio_list_id);
			break;
		case 'budget':
			return '/expenses';
		case 'earnings':
		case 'price_target':
			if (payload.symbol) return '/portfolio/' + pathEscape(payload.symbol);
			break;
		case 'tax':
			return '/tax';
	}
	return '';
}
