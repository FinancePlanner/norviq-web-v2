// Pure helpers ported from norviq-web internal/pages/articles (share.go,
// viewmodel.go, articles.templ) and internal/handlers/articles.go. Safe on
// server and client.

import { shortDate } from '#lib/features/settings-admin/go-time.js';
import type { ArticleSummary, Card } from './types.js';

/** The error message composeGate's 403 carries; (app)/articles/+error.svelte keys on it. */
export const BOARDS_BANNED = 'Boards access removed';

export const DISCLAIMER = 'User-generated opinion. Not investment advice.';

const codePattern = /^[abcdefghjkmnpqrstuvwxyz23456789]{8}$/;
const tickerPattern = /^[A-Z][A-Z0-9.-]{0,9}$/;
export const articleUsernamePattern = /^[A-Za-z0-9_]{1,32}$/;
export const uuidPattern = /^[0-9a-fA-F-]{36}$/;
export const cursorPattern = /^\d{1,16}_[0-9A-Fa-f-]{36}$/;

// eslint-disable-next-line no-control-regex
const isASCII = (s: string) => /^[\x00-\x7f]*$/.test(s);

/** articles.Path: an article's canonical path. */
export function articlePath(slug: string, code: string): string {
	return '/articles/' + slug + '-' + code;
}

/** articles.ParseSlugCode: "{slug}-{code}" or a bare code → the code. */
export function parseSlugCode(segment: string): string | null {
	if (!isASCII(segment)) return null;
	const lower = segment.toLowerCase();
	const i = lower.lastIndexOf('-');
	const code = i >= 0 ? lower.slice(i + 1) : lower;
	return codePattern.test(code) ? code : null;
}

/** articles.NormalizeTicker: uppercases an ASCII ticker and strips a leading "$". */
export function normalizeTicker(raw: string): string | null {
	let trimmed = raw.trim();
	if (trimmed.startsWith('$')) trimmed = trimmed.slice(1);
	if (!isASCII(trimmed)) return null;
	const t = trimmed.toUpperCase();
	return tickerPattern.test(t) ? t : null;
}

/** Go time.Format(time.RFC3339) on a UTC time: whole seconds, "Z". */
export function rfc3339(raw: string): string {
	const d = new Date(raw);
	if (Number.isNaN(d.getTime())) return raw;
	return d.toISOString().replace(/\.\d+Z$/, 'Z');
}

/** "Jan 2, 2006" in UTC. */
export const goShortDate = shortDate;

/** articleCard (handlers/articles.go). */
export function articleCard(s: ArticleSummary): Card {
	let byline = s.author?.username ? '@' + s.author.username : 'Unknown';
	byline += ' · ' + goShortDate(s.publishedAt);
	const bullets = s.bulletPoints ?? [];
	return {
		url: articlePath(s.slug, s.code),
		title: s.title,
		tickers: s.tickers ?? [],
		firstBullet: bullets[0] ?? '',
		byline,
		upvotes: s.upvoteCount,
		views: s.viewCount
	};
}

/** articleNotices: fixed copy, never backend text. */
export const ARTICLE_NOTICES: Record<string, string> = {
	published: 'Published. Share it below.',
	updated: 'Saved.',
	reported: 'Thanks. A person will review the report.',
	hidden: 'Hidden from everyone but the author.',
	unhidden: 'Visible again.',
	deleted: 'Deleted.',
	report_fail: "That report didn't go through. Try again.",
	action_fail: "That action didn't go through."
};

export function noticeFor(key: string | null): string {
	return key && Object.hasOwn(ARTICLE_NOTICES, key) ? ARTICLE_NOTICES[key] : '';
}

export const REPORT_REASONS = [
	{ value: 'scam', label: 'Scam or pump-and-dump' },
	{ value: 'spam', label: 'Spam' },
	{ value: 'harassment', label: 'Harassment' },
	{ value: 'hate', label: 'Hate' },
	{ value: 'impersonation', label: 'Impersonation' },
	{ value: 'inappropriate', label: 'Inappropriate' },
	{ value: 'other', label: 'Other' }
];

/**
 * Go's json.Marshal: HTML-escapes <, > and & (and U+2028/2029), so the result
 * is safe inside <script>. Callers build objects with keys in Go's sorted
 * map order.
 */
export function goJSON(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replaceAll(String.fromCharCode(0x2028), '\\u2028')
		.replaceAll(String.fromCharCode(0x2029), '\\u2029');
}
