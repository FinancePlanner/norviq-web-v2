// Shapes of norviq-web internal/api/articles.go (StockPlanShared ArticlesDTOs)
// and the view models of internal/pages/articles/viewmodel.go. The Go client
// is hand-written, so these follow it rather than src/lib/api/schema.d.ts.

import type { ShareLinks } from '#lib/components/norviq/share-links.js';

export interface ArticleAuthor {
	id: string;
	username: string | null;
	avatarURL: string | null;
}

export interface ArticleSummary {
	id: string;
	code: string;
	slug: string;
	title: string;
	bulletPoints: string[] | null;
	tickers: string[] | null;
	author: ArticleAuthor;
	coverImageId: string | null;
	upvoteCount: number;
	viewCount: number;
	wordCount: number;
	status: string;
	source: string;
	publishedAt: string;
	editedAt: string | null;
}

export interface ArticleDetail {
	article: ArticleSummary;
	bodyMarkdown: string;
	disclosure: string;
	viewerUpvoted: boolean;
	viewerIsAuthor: boolean;
}

export interface ArticlePage {
	items: ArticleSummary[] | null;
	nextCursor: string | null;
}

export interface ArticleWriteRequest {
	title: string;
	bodyMarkdown: string;
	bulletPoints: string[] | null;
	tickers: string[] | null;
	disclosure: string;
	coverImageId: string | null;
	source?: string;
}

export interface ArticleVoteResponse {
	upvoteCount: number;
	voted: boolean;
}

export interface ArticleListQuery {
	ticker?: string;
	author?: string;
	cursor?: string;
	limit?: number;
}

/** api.CommunityViewerStatus (GET /v1/community/me). */
export interface CommunityViewerStatus {
	isAdmin: boolean;
	guidelinesAccepted: boolean;
	hasUsername: boolean;
	activeSanction: { kind: string; expiresAt?: string | null } | null;
}

// MARK: view models

/** articles.Card: one feed row. */
export interface Card {
	url: string;
	title: string;
	tickers: string[];
	firstBullet: string;
	byline: string;
	upvotes: number;
	views: number;
}

export interface FeedVM {
	heading: string;
	subheading: string;
	canonicalURL: string;
	metaDescription: string;
	ogImage: string;
	cards: Card[];
	nextURL: string;
	notice: string;
}

export interface TickerLink {
	symbol: string;
	feedURL: string;
	/** Empty when the ticker has no public /s/ page. */
	stockURL: string;
}

export interface DetailVM {
	code: string;
	title: string;
	canonicalURL: string;
	metaDescription: string;
	ogImageURL: string;
	cardImageURL: string;
	coverURL: string;
	viewURL: string;
	loginURL: string;
	tickers: TickerLink[];
	bullets: string[];
	bodyHTML: string;
	disclosure: string;
	author: string;
	authorURL: string;
	publishedISO: string;
	modifiedISO: string;
	publishedLabel: string;
	edited: boolean;
	readingMinutes: number;
	views: number;
	upvotes: number;
	viewerUpvoted: boolean;
	viewerIsAuthor: boolean;
	signedIn: boolean;
	isAdmin: boolean;
	hidden: boolean;
	indexable: boolean;
	share: ShareLinks;
	more: Card[];
	jsonLD: string;
	notice: string;
}

export interface ComposeForm {
	title: string;
	tickers: string;
	bullets: [string, string, string];
	body: string;
	disclosure: string;
	coverImageID: string;
	/** The composer's one-per-form nonce, sent as Idempotency-Key. Only new articles carry one. */
	idempotencyKey: string;
}

export interface ComposeVM {
	heading: string;
	action: string;
	submit: string;
	form: ComposeForm;
	preview: string;
	error: string;
	blocked: boolean;
}
