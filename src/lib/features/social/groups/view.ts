import type {
	ChannelItem,
	FriendOption,
	GroupCard,
	GroupDetail,
	GroupInviteLink,
	GroupMember,
	GroupMessage,
	GroupSummary,
	InviteLinkRow,
	MemberRow,
	MessageRow,
	RailItem,
	Segment
} from './types.js';

// Ports of norviq-web internal/pages/groups/helpers.go and the view helpers in
// internal/handlers/groups.go. Client-safe and pure.

/** groupNotices: the ?notice= values redirects use, mapped to fixed copy. */
export const groupNotices: Record<string, string> = {
	created: 'Group created. Invite some friends to get it going.',
	joined: "You're in.",
	left: 'You left the group.',
	deleted: 'Group deleted.',
	declined: 'Invitation declined.',
	saved: 'Saved.',
	invited: 'Invitations sent.',
	link: 'Invite link created. Copy it below.',
	revoked: 'Link revoked.',
	channel: 'Channel added.',
	unchannel: 'Channel deleted.',
	member: 'Done.',
	blocked: "Blocked. You won't see their messages.",
	muted: 'Notifications off for this group.',
	unmuted: 'Notifications on for this group.',
	removed: "You're no longer in that group.",
	// Back from the community guidelines prompt.
	guidelines: "You're set. Welcome to Groups."
};

export function groupNotice(url: URL): string {
	return groupNotices[url.searchParams.get('notice') ?? ''] ?? '';
}

/** groupsError: the ?error= text a redirect carried, capped at 200 bytes. */
export function groupsError(url: URL): string {
	const text = url.searchParams.get('error') ?? '';
	const bytes = new TextEncoder().encode(text);
	if (bytes.length <= 200) return text;
	return new TextDecoder().decode(bytes.slice(0, 200)).replace(/�$/, '');
}

/**
 * sameID compares backend ids. The backend sends upper-case UUIDs while path
 * parameters are normalised to lower case, so ids compare case-insensitively.
 */
export const sameID = (a: unknown, b: unknown) =>
	typeof a === 'string' && typeof b === 'string' && a !== '' && a.toLowerCase() === b.toLowerCase();

/** ChatHref is a channel's address. */
export const chatHref = (groupID: string, channelID: string) => `/groups/${groupID}/c/${channelID}`;

/** withQuery appends key=value (Go url.QueryEscape) to path. */
export function withQuery(path: string, key: string, value: string): string {
	const sep = path.includes('?') ? '&' : '?';
	return path + sep + key + '=' + queryEscape(value);
}

/** withNotice (handlers/boards.go): notice goes before any #fragment. */
export function withNotice(path: string, notice: string): string {
	const sep = path.includes('?') ? '&' : '?';
	const hash = path.indexOf('#');
	if (hash >= 0) return path.slice(0, hash) + sep + 'notice=' + notice + path.slice(hash);
	return path + sep + 'notice=' + notice;
}

/** url.QueryEscape: spaces become '+'. */
export function queryEscape(value: string): string {
	return encodeURIComponent(value)
		.replace(/%20/g, '+')
		.replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

// MARK: tickers

const isASCIILetter = (c: number) => (c >= 97 && c <= 122) || (c >= 65 && c <= 90);
const isSymbolChar = (c: number) =>
	c >= 0 && c < 127 && (isASCIILetter(c) || (c >= 48 && c <= 57) || c === 46 || c === 45);

/**
 * SplitTickers cuts a message body into text and $TICKER chips. A ticker is a
 * $ at a word start, a letter, then up to 11 more letters, digits, dots or
 * dashes; a trailing dot or dash is punctuation.
 */
export function splitTickers(body: string): Segment[] {
	const segments: Segment[] = [];
	let textStart = 0;
	let prev = -1;
	let i = 0;
	while (i < body.length) {
		const c = body.charCodeAt(i);
		if (
			c === 36 &&
			!isSymbolChar(prev) &&
			prev !== 36 &&
			i + 1 < body.length &&
			isASCIILetter(body.charCodeAt(i + 1))
		) {
			let end = i + 1;
			while (end < body.length && isSymbolChar(body.charCodeAt(end))) end++;
			let symbolEnd = end;
			while (symbolEnd > i + 2 && (body[symbolEnd - 1] === '.' || body[symbolEnd - 1] === '-'))
				symbolEnd--;
			if (symbolEnd - i - 1 <= 12) {
				if (textStart < i) segments.push({ text: body.slice(textStart, i) });
				segments.push({
					text: body.slice(i, symbolEnd),
					ticker: body.slice(i + 1, symbolEnd).toUpperCase()
				});
				textStart = symbolEnd;
			}
			prev = body.charCodeAt(end - 1);
			i = end;
			continue;
		}
		prev = c;
		i++;
	}
	if (textStart < body.length) segments.push({ text: body.slice(textStart) });
	return segments;
}

// MARK: time in the viewer's zone

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Zoned {
	y: number;
	mo: number;
	d: number;
	h: number;
	mi: number;
	s: number;
	/** offset from UTC in minutes */
	offset: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function zoned(date: Date, tz: string): Zoned {
	let f = formatters.get(tz);
	if (!f) {
		f = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23'
		});
		formatters.set(tz, f);
	}
	const parts: Record<string, number> = {};
	for (const p of f.formatToParts(date)) if (p.type !== 'literal') parts[p.type] = Number(p.value);
	const z = {
		y: parts.year,
		mo: parts.month,
		d: parts.day,
		h: parts.hour % 24,
		mi: parts.minute,
		s: parts.second,
		offset: 0
	};
	const asUTC = Date.UTC(z.y, z.mo - 1, z.d, z.h, z.mi, z.s);
	z.offset = Math.round((asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000);
	return z;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function rfc3339(z: Zoned): string {
	let off = 'Z';
	if (z.offset !== 0) {
		const a = Math.abs(z.offset);
		off = (z.offset < 0 ? '-' : '+') + pad(Math.floor(a / 60)) + ':' + pad(a % 60);
	}
	return `${pad(z.y, 4)}-${pad(z.mo)}-${pad(z.d)}T${pad(z.h)}:${pad(z.mi)}:${pad(z.s)}${off}`;
}

const sameDay = (a: Zoned, b: { y: number; mo: number; d: number }) =>
	a.y === b.y && a.mo === b.mo && a.d === b.d;

function addDays(z: { y: number; mo: number; d: number }, days: number) {
	const t = new Date(Date.UTC(z.y, z.mo - 1, z.d + days));
	return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function dayLabel(day: Zoned, now: Zoned): string {
	if (sameDay(day, now)) return 'Today';
	if (sameDay(day, addDays(now, -1))) return 'Yesterday';
	const weekday = WEEKDAYS[new Date(Date.UTC(day.y, day.mo - 1, day.d)).getUTCDay()];
	if (day.y === now.y) return `${weekday}, ${MONTHS[day.mo - 1]} ${day.d}`;
	return `${MONTHS[day.mo - 1]} ${day.d}, ${day.y}`;
}

/** Go "Jan 2" in UTC (backend times decode as UTC). */
export function shortMonthDay(t: Date): string {
	return `${MONTHS[t.getUTCMonth()].slice(0, 3)} ${t.getUTCDate()}`;
}

// MARK: rows

/** groupWindow: how close two messages from one author must be to share an author line. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export interface RowOptions {
	viewerID: string;
	canModerate: boolean;
	/** Places the "New messages" divider; zero draws none. */
	lastReadSeq: number;
	timezone: string;
	now?: Date;
}

export function initial(name: string): string {
	const first = Array.from(name)[0];
	if (first === undefined) return '?';
	return first.toUpperCase();
}

const sameAuthor = (a: GroupMessage, b: GroupMessage) =>
	!!a.authorId && !!b.authorId && a.authorId === b.authorId;

/**
 * BuildRows turns messages (oldest first) into rows. prev is the message just
 * before the first one, when the page continues an earlier one, so a live
 * append groups with what is already on screen.
 */
export function buildRows(
	messages: GroupMessage[],
	prev: GroupMessage | null,
	opts: RowOptions
): MessageRow[] {
	const tz = opts.timezone || 'UTC';
	const now = zoned(opts.now ?? new Date(), tz);
	const rows: MessageRow[] = [];
	let dividerPlaced = false;
	for (const message of messages) {
		const created = new Date(message.createdAt);
		const local = zoned(created, tz);
		const author = message.authorUsername ? message.authorUsername : 'deleted user';
		const own =
			!!message.authorId &&
			opts.viewerID !== '' &&
			message.authorId.toLowerCase() === opts.viewerID.toLowerCase();
		const row: MessageRow = {
			id: message.id,
			seq: message.seq,
			clientId: message.clientMessageId ?? '',
			author,
			initial: initial(author),
			time: `${pad(local.h)}:${pad(local.mi)}`,
			stamp: rfc3339(local),
			segments: !message.isDeleted && message.body != null ? splitTickers(message.body) : [],
			deleted: message.isDeleted,
			continued: false,
			dayLabel: '',
			newDivider: false,
			own,
			canDelete: !message.isDeleted && (own || opts.canModerate),
			canReport: !message.isDeleted && !own
		};
		if (!prev || !sameDay(zoned(new Date(prev.createdAt), tz), local))
			row.dayLabel = dayLabel(local, now);
		if (opts.lastReadSeq > 0 && !dividerPlaced && message.seq > opts.lastReadSeq && !own) {
			row.newDivider = true;
			dividerPlaced = true;
		}
		row.continued =
			!!prev &&
			row.dayLabel === '' &&
			!row.newDivider &&
			sameAuthor(prev, message) &&
			created.getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
		rows.push(row);
		prev = message;
	}
	return rows;
}

// MARK: cards

/** Age is a short relative time: "now", "5m", "3h", "2d", then a date. */
export function age(t: Date, now: Date): string {
	const d = now.getTime() - t.getTime();
	if (d < 60_000) return 'now';
	if (d < 3_600_000) return Math.floor(d / 60_000) + 'm';
	if (d < 86_400_000) return Math.floor(d / 3_600_000) + 'h';
	if (d < 7 * 86_400_000) return Math.floor(d / 86_400_000) + 'd';
	return shortMonthDay(t);
}

/** Card maps a group summary to a list card. */
export function card(group: GroupSummary, now: Date): GroupCard {
	let preview = '';
	if (group.lastMessage) {
		preview = group.lastMessage.excerpt ?? '';
		if (group.lastMessage.authorUsername)
			preview = group.lastMessage.authorUsername + ': ' + preview;
	}
	return {
		id: group.id,
		name: group.name,
		description: group.description ?? '',
		emoji: group.iconEmoji ?? '',
		ticker: group.ticker ?? '',
		topic: group.topic,
		public: group.visibility === 'public',
		members: group.memberCount,
		href: '/groups/' + group.id,
		preview,
		activity: group.lastMessageAt ? age(new Date(group.lastMessageAt), now) : '',
		unread: group.unreadCount,
		muted: group.membership ? !group.membership.pushEnabled : false,
		member: !!group.membership
	};
}

/** Tile is the rail tile: the group's emoji, or its first letter. */
export const tile = (c: { emoji: string; name: string }) =>
	c.emoji !== '' ? c.emoji : initial(c.name);

/** BadgeText caps a count for a small badge. */
export const badgeText = (n: number) => (n > 99 ? '99+' : String(n));

/** Topics are the create form's topic chips, in order. */
export const topics: { value: string; label: string }[] = [
	{ value: 'stock', label: 'Stock' },
	{ value: 'etf', label: 'ETF' },
	{ value: 'crypto', label: 'Crypto' },
	{ value: 'community', label: 'Community' },
	{ value: 'custom', label: 'Anything' }
];

export function topicLabel(topic: string): string {
	return topics.find((o) => o.value === topic)?.label ?? 'Custom';
}

/** TopicAllowsTicker mirrors GroupTopic.allowsTicker. */
export const topicAllowsTicker = (topic: string) =>
	topic === 'stock' || topic === 'etf' || topic === 'crypto';

/** formTopic: the selected topic from the fixed list, else "stock". */
export const formTopic = (topic: string) =>
	topics.some((o) => o.value === topic) ? topic : 'stock';

/** boards.ReportReasons: the report menu, in order. */
export const reportReasons: { value: string; label: string }[] = [
	{ value: 'spam', label: 'Spam' },
	{ value: 'harassment', label: 'Harassment' },
	{ value: 'hate', label: 'Hate' },
	{ value: 'scam', label: 'Scam' },
	{ value: 'impersonation', label: 'Impersonation' },
	{ value: 'inappropriate', label: 'Inappropriate' },
	{ value: 'other', label: 'Other' }
];

export function railLabel(item: RailItem): string {
	return item.unread > 0 ? `${item.name}, ${item.unread} unread` : item.name;
}

export function railItems(items: GroupSummary[], activeID: string): RailItem[] {
	return items.map((group) => ({
		id: group.id,
		name: group.name,
		href: '/groups/' + group.id,
		unread: group.unreadCount,
		active: sameID(group.id, activeID),
		emoji: group.iconEmoji ?? '',
		muted: group.membership ? !group.membership.pushEnabled : false
	}));
}

export function channelItems(detail: GroupDetail, activeID: string): ChannelItem[] {
	return (detail.channels ?? []).map((channel) => ({
		id: channel.id,
		name: channel.name,
		href: chatHref(detail.group.id, channel.id),
		unread: channel.unreadCount,
		active: sameID(channel.id, activeID)
	}));
}

/** groupLanding is where a group opens: its default channel, else its first. */
export function groupLanding(detail: GroupDetail): string {
	if (detail.group.defaultChannelId)
		return chatHref(detail.group.id, detail.group.defaultChannelId);
	const first = detail.channels?.[0];
	if (first) return chatHref(detail.group.id, first.id);
	return '/groups/' + detail.group.id + '/settings';
}

/** memberRows: owners act on anyone else, admins on plain members. */
export function memberRows(
	members: GroupMember[],
	viewerID: string,
	viewerRole: string,
	canModerate: boolean
): MemberRow[] {
	return members.map((member) => {
		let name = 'deleted user';
		if (member.displayName) name = member.displayName;
		if (member.username) {
			if (name === 'deleted user') name = '@' + member.username;
			else name += ' (@' + member.username + ')';
		}
		const self = member.userId.toLowerCase() === viewerID.toLowerCase();
		const manageable =
			canModerate &&
			!self &&
			member.role !== 'owner' &&
			(viewerRole === 'owner' || member.role === 'member');
		return {
			userId: member.userId,
			name,
			role: member.role,
			canManage: manageable,
			isOwner: member.role === 'owner',
			self
		};
	});
}

export function inviteLinkRows(links: GroupInviteLink[], now: Date): InviteLinkRow[] {
	const rows: InviteLinkRow[] = [];
	for (const link of links) {
		let uses = link.uses + ' joined';
		if (link.maxUses != null) uses = link.uses + ' of ' + link.maxUses;
		let expires = 'never expires';
		if (link.expiresAt) {
			const at = new Date(link.expiresAt);
			if (at.getTime() < now.getTime()) continue;
			expires = 'expires ' + shortMonthDay(at);
		}
		rows.push({ id: link.id, url: link.url, uses, expires });
	}
	return rows;
}

export function roleLabel(role: string): string {
	if (role === 'owner') return 'Owner';
	if (role === 'admin') return 'Admin';
	return 'Member';
}

export function settingsSubtitle(group: GroupCard): string {
	const visibility = group.public ? 'Public group' : 'Private group';
	if (group.ticker !== '') return visibility + ' about $' + group.ticker;
	return visibility + ' · ' + topicLabel(group.topic);
}

export type { FriendOption };
