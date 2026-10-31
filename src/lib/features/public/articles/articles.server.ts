// Server side of the articles feature: the RequireArticles gate, the article
// API client (norviq-web internal/api/articles.go) and the view-model builders
// of internal/handlers/articles.go and articles_compose.go.

import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { APIError, apiFetch, apiJSON, clientIP } from '#lib/server/api.js';
import { loadArticlesEnabled } from '#lib/server/app-context.js';
import { config } from '#lib/server/env.js';
import { render as renderMarkdown } from '#lib/markdown.js';
import { allowedSymbol } from '#lib/publicsymbols.js';
import { queryEscape } from '#lib/sharelinks.js';
import { buildShareLinks } from '#lib/components/norviq/share-links.js';
import {
	BOARDS_BANNED,
	DISCLAIMER,
	articleCard,
	articlePath,
	cursorPattern,
	goJSON,
	goShortDate,
	noticeFor,
	rfc3339
} from './articles.js';
import type {
	ArticleDetail,
	ArticleListQuery,
	ArticlePage,
	ArticleSummary,
	ArticleVoteResponse,
	ArticleWriteRequest,
	CommunityViewerStatus,
	ComposeForm,
	ComposeVM,
	DetailVM,
	FeedVM
} from './types.js';

type Auth = 'session' | 'public';

// Shared caches hold article responses; browsers revalidate (articles.go).
export const ARTICLE_PAGE_CACHE_CONTROL = 'public, max-age=0, s-maxage=900';
export const ARTICLE_SHORT_LINK_CACHE_CONTROL = 'public, max-age=3600';
export const ARTICLE_COVER_CACHE_CONTROL = 'public, max-age=86400';
export const ARTICLE_SLUG_REDIRECT_CACHE_CONTROL = 'public, max-age=300';
export const SIGNED_IN_CACHE_CONTROL = 'private, no-store';

/** middleware.RequireArticles: 404 while the backend has articles off. */
export async function requireArticles(event: RequestEvent): Promise<void> {
	if (!(await loadArticlesEnabled(event))) error(404, 'Not Found');
}

export function signedIn(event: RequestEvent): boolean {
	return !!event.locals.session.accessToken;
}

/** reader: the visitor's own token when signed in, the public token otherwise. */
export function readerAuth(event: RequestEvent): Auth {
	return signedIn(event) ? 'session' : 'public';
}

/**
 * Go's public pages are rendered without per-visitor state and shared through
 * the CDN. A v2 page always carries the root layout's data (the signed-in
 * user), so a signed-in visitor's copy must never be shared: it is no-store.
 */
export function pageCacheControl(event: RequestEvent, shared: string): string {
	return event.locals.session.isAuthenticated ? SIGNED_IN_CACHE_CONTROL : shared;
}

export function base(): string {
	return config().publicBaseURL.replace(/\/+$/, '');
}

const articleRef = (ref: string, ...rest: string[]) =>
	'/v1/articles/' + encodeURIComponent(ref) + rest.map((s) => '/' + s).join('');

// MARK: - API client

export function listArticles(event: RequestEvent, q: ArticleListQuery, auth: Auth = 'public') {
	return apiJSON<ArticlePage>(event, 'GET', '/v1/articles', undefined, {
		auth,
		query: {
			ticker: q.ticker,
			author: q.author,
			cursor: q.cursor,
			limit: q.limit && q.limit > 0 ? q.limit : undefined
		}
	});
}

export function getArticle(event: RequestEvent, ref: string, auth: Auth) {
	return apiJSON<ArticleDetail>(event, 'GET', articleRef(ref), undefined, { auth });
}

export function createArticle(
	event: RequestEvent,
	req: ArticleWriteRequest,
	idempotencyKey: string
) {
	return apiJSON<ArticleDetail>(event, 'POST', '/v1/articles', req, {
		headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined
	});
}

export function updateArticle(event: RequestEvent, ref: string, req: ArticleWriteRequest) {
	return apiJSON<ArticleDetail>(event, 'PATCH', articleRef(ref), req);
}

export function deleteArticle(event: RequestEvent, ref: string) {
	return apiJSON<void>(event, 'DELETE', articleRef(ref));
}

export function voteArticle(event: RequestEvent, ref: string, on: boolean) {
	return apiJSON<ArticleVoteResponse>(event, on ? 'POST' : 'DELETE', articleRef(ref, 'vote'));
}

export function reportArticle(event: RequestEvent, ref: string, reason: string, note: string) {
	return apiJSON<void>(event, 'POST', articleRef(ref, 'report'), { reason, note: note || null });
}

export function setArticleVisibility(event: RequestEvent, ref: string, hidden: boolean) {
	return apiJSON<void>(
		event,
		'PUT',
		'/v1/admin/articles/' + encodeURIComponent(ref) + '/visibility',
		{ hidden }
	);
}

export function communityViewer(event: RequestEvent) {
	return apiJSON<CommunityViewerStatus>(event, 'GET', '/v1/community/me');
}

/** RecordArticleView: forwards a hashed visitor key as X-Norviq-Viewer. */
export async function recordArticleView(event: RequestEvent, ref: string, viewerKey: string) {
	const res = await apiFetch(event, 'POST', articleRef(ref, 'view'), null, {
		auth: readerAuth(event),
		headers: { 'X-Norviq-Viewer': viewerKey },
		signal: AbortSignal.timeout(3000)
	});
	if (!res.ok) throw await boardsError(res);
}

/** UploadArticleImage: one cover as multipart field "file"; returns the new id. */
export async function uploadArticleImage(event: RequestEvent, file: File): Promise<string> {
	const body = new FormData();
	body.set('file', file, file.name);
	const res = await apiFetch(event, 'POST', '/v1/articles/images', body);
	if (!res.ok) throw await boardsError(res);
	const out = (await res.json()) as { id?: string };
	return out.id ?? '';
}

/** FetchArticleImage: a cover's response, or a thrown APIError. */
export async function fetchArticleImage(event: RequestEvent, id: string): Promise<Response> {
	const res = await apiFetch(event, 'GET', '/v1/articles/images/' + encodeURIComponent(id), null, {
		auth: 'public'
	});
	if (!res.ok) throw await boardsError(res);
	return res;
}

async function boardsError(res: Response): Promise<APIError> {
	let envelope: { code?: string; reason?: string } = {};
	try {
		envelope = (await res.json()) as typeof envelope;
	} catch {
		/* not JSON */
	}
	return new APIError(res.status, envelope?.reason ?? '', envelope?.code, envelope);
}

// MARK: - Errors

const statusOf = (err: unknown) => (err instanceof APIError ? err.status : 0);

/** credentialRejected: the backend refused the visitor's own token. */
export function credentialRejected(err: unknown): boolean {
	const s = statusOf(err);
	return s === 401 || s === 403;
}

/** detailFailed: 404 for a missing article, 502 for anything else. */
export function detailFailed(path: string, err: unknown): never {
	if (statusOf(err) === 404) error(404, 'Not Found');
	console.error('load article', path, err);
	error(502, 'Articles are temporarily unavailable');
}

/** boardsErrorText: a 4xx reason, else a generic line. */
export function boardsErrorText(err: unknown): string {
	if (err instanceof APIError && err.status >= 400 && err.status < 500 && err.reason)
		return err.reason;
	return "That didn't work. Try again in a moment.";
}

/** redirectToArticle: 301 to the canonical path, keeping the query string. */
export function redirectToArticle(event: RequestEvent, to: string, cacheControl: string): never {
	const query = event.url.search;
	event.setHeaders({ 'cache-control': cacheControl });
	redirect(301, to + (query.length > 1 ? query : ''));
}

// MARK: - View models

export async function viewerIsAdmin(event: RequestEvent): Promise<boolean> {
	try {
		return (await communityViewer(event)).isAdmin;
	} catch {
		return false;
	}
}

export async function detailVM(
	event: RequestEvent,
	d: ArticleDetail,
	personal: boolean
): Promise<DetailVM> {
	const a = d.article;
	const path = articlePath(a.slug, a.code);
	const canonical = base() + path;
	const tickersRaw = a.tickers ?? [];
	const bullets = a.bulletPoints ?? [];
	const author = a.author?.username ? '@' + a.author.username : 'Unknown';
	const authorURL = a.author?.username
		? '/u/' + encodeURIComponent(a.author.username) + '/articles'
		: '/articles';
	const modified = a.editedAt ?? a.publishedAt;
	const vm: DetailVM = {
		code: a.code,
		title: a.title,
		canonicalURL: canonical,
		metaDescription: bullets.length > 0 ? bullets[0] : a.title,
		ogImageURL: base() + '/articles/' + a.code + '/og.png',
		cardImageURL: '/articles/' + a.code + '/card.png',
		coverURL: a.coverImageId ? '/articles/images/' + encodeURIComponent(a.coverImageId) : '',
		viewURL: '/articles/' + a.code + '/view',
		loginURL: '/login?next=' + queryEscape(path),
		tickers: tickersRaw.map((t) => ({
			symbol: t,
			feedURL: '/articles/ticker/' + encodeURIComponent(t),
			stockURL: allowedSymbol(t) ? '/s/' + encodeURIComponent(t) : ''
		})),
		bullets,
		bodyHTML: renderMarkdown(d.bodyMarkdown ?? ''),
		disclosure: d.disclosure,
		author,
		authorURL,
		publishedISO: rfc3339(a.publishedAt),
		modifiedISO: rfc3339(modified),
		publishedLabel: goShortDate(a.publishedAt),
		edited: a.editedAt != null,
		readingMinutes: Math.max(1, Math.floor(a.wordCount / 220)),
		views: a.viewCount,
		upvotes: a.upvoteCount,
		viewerUpvoted: personal && d.viewerUpvoted,
		viewerIsAuthor: personal && d.viewerIsAuthor,
		signedIn: personal,
		isAdmin: false,
		hidden: a.status === 'hidden',
		indexable: a.status === 'published',
		share: buildShareLinks({
			canonical,
			title: a.title,
			tickers: tickersRaw,
			bullets,
			disclaimer: DISCLAIMER,
			captionCTA: 'Read it on Norviq (link in bio).'
		}),
		more: [],
		jsonLD: '',
		notice: ''
	};
	vm.jsonLD = articleJSONLD(vm, a);
	if (tickersRaw.length > 0) {
		try {
			const page = await listArticles(event, { ticker: tickersRaw[0], limit: 4 });
			for (const s of page.items ?? []) {
				if (s.code !== a.code && vm.more.length < 3) vm.more.push(articleCard(s));
			}
		} catch {
			/* "More on" is optional */
		}
	}
	return vm;
}

/** articleJSONLD: keys in Go's sorted map order, Go's HTML-safe escaping. */
function articleJSONLD(vm: DetailVM, a: ArticleSummary): string {
	return goJSON({
		'@context': 'https://schema.org',
		'@type': 'Article',
		author: { '@type': 'Person', name: vm.author },
		dateModified: vm.modifiedISO,
		datePublished: vm.publishedISO,
		description: vm.metaDescription,
		headline: a.title,
		image: vm.ogImageURL,
		keywords: a.tickers,
		mainEntityOfPage: vm.canonicalURL,
		publisher: { '@type': 'Organization', name: 'Norviq' },
		url: vm.canonicalURL,
		wordCount: a.wordCount
	});
}

/**
 * serveFeed: one page of 20, cursor from the query, CDN-cacheable. Feeds read
 * with the public token for everyone, as in Go.
 */
export async function loadFeed(
	event: RequestEvent,
	q: ArticleListQuery,
	vm: Pick<FeedVM, 'heading' | 'metaDescription'> & { subheading?: string },
	basePath: string
): Promise<FeedVM> {
	const cursor = event.url.searchParams.get('cursor') ?? '';
	if (cursorPattern.test(cursor)) q.cursor = cursor;
	q.limit = 20;
	let page: ArticlePage;
	try {
		page = await listArticles(event, q);
	} catch (err) {
		console.error('list articles', event.url.pathname, err);
		error(502, 'Articles are temporarily unavailable');
	}
	event.setHeaders({ 'cache-control': pageCacheControl(event, ARTICLE_PAGE_CACHE_CONTROL) });
	return {
		heading: vm.heading,
		subheading: vm.subheading ?? '',
		metaDescription: vm.metaDescription,
		canonicalURL: base() + basePath,
		ogImage: base() + '/static/images/og.png',
		cards: (page.items ?? []).map(articleCard),
		nextURL: page.nextCursor ? basePath + '?cursor=' + queryEscape(page.nextCursor) : '',
		notice: noticeFrom(event)
	};
}

export const noticeFrom = (event: RequestEvent) => noticeFor(event.url.searchParams.get('notice'));

// MARK: - Visitor key

/** visitorKey: a daily-salted hash of the reader's IP, never the raw IP. */
export async function visitorKey(event: RequestEvent): Promise<string> {
	const day = new Date().toISOString().slice(0, 10);
	const data = new TextEncoder().encode(
		clientIP(event) + '|' + day + '|' + config().publicAPIToken
	);
	const sum = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
	return Array.from(sum.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

// MARK: - Compose

export const ARTICLE_FORM_MAX_BYTES = 4 << 20;
const ARTICLE_COVER_MAX_BYTES = 2_000_000;
export const ARTICLE_PREVIEW_MAX_RUNES = 20_000;
export const ARTICLE_PREVIEW_BODY_LIMIT = 256 << 10;
export const ARTICLE_VIEW_BODY_LIMIT = 1 << 10;

export const idempotencyKeyPattern = /^[0-9a-f]{32}$/;

/** newIdempotencyKey: 128 random bits, hex. */
export function newIdempotencyKey(): string {
	const b = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/** ArticleBodyLimits: a declared Content-Length over the cap is refused outright. */
export function enforceBodyLimit(event: RequestEvent, limit: number): void {
	const len = Number(event.request.headers.get('content-length') ?? '0');
	if (len > limit) error(413, 'Request body too large');
}

/**
 * composeGate (+ loadBoardsViewer): a banned member gets the Boards banned
 * page (403, rendered by (app)/articles/+error.svelte), one who hasn't
 * accepted the guidelines is sent to them, and one without a username sees
 * the composer blocked.
 */
export async function composeGate(event: RequestEvent, vm: ComposeVM): Promise<void> {
	let status: CommunityViewerStatus;
	try {
		status = await communityViewer(event);
	} catch (err) {
		console.error('community viewer load failed', err);
		error(502, 'Boards are temporarily unavailable');
	}
	if (status.activeSanction && !status.isAdmin && status.activeSanction.kind === 'ban') {
		error(403, BOARDS_BANNED);
	}
	if (!status.guidelinesAccepted && !status.isAdmin) {
		redirect(303, '/boards/guidelines?next=' + queryEscape(event.url.pathname + event.url.search));
	}
	if (!status.hasUsername) {
		vm.blocked = true;
		vm.error = 'Pick a username in Settings before publishing.';
	}
}

export function emptyForm(): ComposeForm {
	return {
		title: '',
		tickers: '',
		bullets: ['', '', ''],
		body: '',
		disclosure: '',
		coverImageID: '',
		idempotencyKey: ''
	};
}

export function composeVM(
	heading: string,
	action: string,
	submit: string,
	form: ComposeForm = emptyForm()
): ComposeVM {
	return { heading, action, submit, form, preview: '', error: '', blocked: false };
}

/** renderCompose's preview: the body rendered when nothing else set it. */
export function withPreview(vm: ComposeVM): ComposeVM {
	if (vm.preview === '' && vm.form.body !== '') vm.preview = renderMarkdown(vm.form.body);
	return vm;
}

const tooLarge = (reason: string) => new APIError(413, reason);

/**
 * readForm: the composer's fields, uploading a new cover first when one was
 * chosen. The form always carries what the person typed, so a failure can
 * re-render it.
 */
export async function readComposeForm(
	event: RequestEvent
): Promise<{ form: ComposeForm; err: unknown; raw: FormData | null }> {
	let data: FormData | null = null;
	try {
		data = await event.request.formData();
	} catch {
		/* handled below */
	}
	const val = (k: string) => {
		const v = data?.get(k);
		return typeof v === 'string' ? v : '';
	};
	const form: ComposeForm = {
		title: val('title'),
		tickers: val('tickers'),
		body: val('body'),
		disclosure: val('disclosure'),
		coverImageID: val('cover_image_id'),
		bullets: [val('bullet1'), val('bullet2'), val('bullet3')],
		idempotencyKey: ''
	};
	if (!data)
		return {
			form,
			err: tooLarge("Couldn't read that upload. Covers can be up to 2 MB."),
			raw: null
		};
	const file = data.get('cover');
	if (!(file instanceof File) || file.size === 0) return { form, err: null, raw: data };
	if (file.size > ARTICLE_COVER_MAX_BYTES)
		return { form, err: tooLarge('That cover is too large. Covers can be up to 2 MB.'), raw: data };
	try {
		form.coverImageID = await uploadArticleImage(event, file);
	} catch (err) {
		return { form, err, raw: data };
	}
	return { form, err: null, raw: data };
}

/** articleWriteRequest */
export function articleWriteRequest(f: ComposeForm): ArticleWriteRequest {
	const bullets = f.bullets.map((b) => b.trim()).filter((b) => b !== '');
	const tickers = f.tickers.split(/[,\s]+/u).filter((t) => t !== '');
	return {
		title: f.title,
		bodyMarkdown: f.body,
		bulletPoints: bullets.length > 0 ? bullets : null,
		tickers: tickers.length > 0 ? tickers : null,
		disclosure: f.disclosure,
		coverImageId: f.coverImageID !== '' ? f.coverImageID : null
	};
}

/**
 * redirectAfterAction: back to the article (looked up with the member's own
 * token, so a hidden one still resolves for a moderator) with a notice, or to
 * the feed when it can't be loaded.
 */
export async function afterActionLocation(
	event: RequestEvent,
	code: string,
	notice: string
): Promise<string> {
	try {
		const d = await getArticle(event, code, 'session');
		return articlePath(d.article.slug, d.article.code) + '?notice=' + notice;
	} catch {
		return '/articles?notice=' + notice;
	}
}
