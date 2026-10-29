// Port of norviq-web handlers/public_portfolio_share.go and
// share_visitor_limiter.go: owner-shared, percent-only portfolio pages at
// /p/{slug}. Never indexed; no public API token (the backend route is itself
// unauthenticated).

import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { config } from '#lib/server/env.js';
import { formatFloat } from '#lib/format.js';
import { allocationColor } from '#lib/charts/palette.js';
import type { DonutSlice } from '#lib/charts/donut-svg.js';
import { PublicPageCache } from '../stock/page-cache.server.js';
import { publicAbsoluteURL } from '../stock/load.server.js';

/** shareSlugPattern: the backend's OpaqueToken.generate(prefix: "p", byteCount: 16). */
export const shareSlugPattern = /^p[A-Za-z0-9_-]{22}$/;

/** shareCacheTTL: bounds how long a revoked link keeps rendering. */
const shareCacheTTLMs = 60_000;

/** shareOtherColor: the neutral wedge for everything past the listed holdings. */
const shareOtherColor = '#94a3b8';

const renderTimeoutMs = 60_000;

export class ShareNotFound extends Error {}
export class ShareUnavailable extends Error {}

interface PortfolioShareHolding {
	symbol: string;
	weightPercent: number;
	unrealizedPnlPercent: number | null;
	dayChangePercent: number | null;
}

interface PublicPortfolioShare {
	asOf: string;
	totals: { unrealizedPnlPercent: number | null; dayChangePercent: number | null; ytdPercent: number | null };
	holdings: PortfolioShareHolding[] | null;
	otherWeightPercent: number | null;
}

export interface PortfolioShareRowVM {
	symbol: string;
	color: string;
	weight: string;
	pnl: string;
	pnlPositive: boolean;
	day: string;
	dayPositive: boolean;
}

export interface PortfolioShareVM {
	canonicalURL: string;
	ogImageURL: string;
	title: string;
	metaDescription: string;
	asOf: string;
	totalPnl: string;
	totalPnlUp: boolean;
	totalDay: string;
	totalDayUp: boolean;
	ytd: string;
	ytdUp: boolean;
	rows: PortfolioShareRowVM[];
	other: string;
	otherColor: string;
	slices: DonutSlice[];
}

// ---- visitor limiter (share_visitor_limiter.go) ----

/** shareVisitorLimit requests per shareVisitorWindow, per client IP. */
const shareVisitorLimit = 30;
const shareVisitorWindowMs = 60_000;

class VisitorLimiter {
	#windowStart = 0;
	#counts = new Map<string, number>();
	constructor(
		private readonly limit: number,
		private readonly windowMs: number
	) {}

	allow(ip: string): boolean {
		const now = Date.now();
		if (now - this.#windowStart >= this.windowMs) {
			this.#windowStart = now;
			this.#counts.clear();
		}
		const n = this.#counts.get(ip) ?? 0;
		if (n >= this.limit) return false;
		this.#counts.set(ip, n + 1);
		return true;
	}
}

// One of each per Worker isolate (Go: one per process).
const visitors = new VisitorLimiter(shareVisitorLimit, shareVisitorWindowMs);
const cache = new PublicPageCache<PortfolioShareVM>(shareCacheTTLMs);

export const allowVisitor = (ip: string) => visitors.allow(ip);

export function cachedPortfolioShare(event: RequestEvent, slug: string): Promise<PortfolioShareVM> {
	return cache.do(slug, () => renderPortfolioShare(event, slug));
}

async function renderPortfolioShare(event: RequestEvent, slug: string): Promise<PortfolioShareVM> {
	let share: PublicPortfolioShare;
	try {
		share = await apiJSON<PublicPortfolioShare>(event, 'GET', '/v1/public/portfolio-shares/' + slug, undefined, {
			auth: 'none',
			signal: AbortSignal.timeout(renderTimeoutMs)
		});
	} catch (err) {
		if (isAPIError(err) && err.status === 404) throw new ShareNotFound('portfolio share not found');
		if (isAPIError(err) && err.status === 429) throw new ShareUnavailable('portfolio share backend is rate limiting');
		throw err;
	}
	const base = config().publicBaseURL;
	return buildPortfolioShareVM(share, publicAbsoluteURL(base, '/p/' + slug), publicAbsoluteURL(base, '/static/images/og.png'));
}

/** formatSharePct: "+1.23%" / "-1.23%" / "—", and whether it is >= 0. */
function formatSharePct(v: number | null | undefined): [string, boolean] {
	if (v == null) return ['—', false];
	return [(v >= 0 ? '+' : '') + formatFloat(v, 2) + '%', v >= 0];
}

export function buildPortfolioShareVM(share: PublicPortfolioShare, canonical: string, ogImage: string): PortfolioShareVM {
	const [totalPnl, totalPnlUp] = formatSharePct(share.totals?.unrealizedPnlPercent);
	const [totalDay, totalDayUp] = formatSharePct(share.totals?.dayChangePercent);
	const [ytd, ytdUp] = formatSharePct(share.totals?.ytdPercent);
	const vm: PortfolioShareVM = {
		canonicalURL: canonical,
		ogImageURL: ogImage,
		title: 'A portfolio on Norviq',
		metaDescription: 'Allocation and returns, shared from Norviq.',
		asOf: share.asOf,
		totalPnl,
		totalPnlUp,
		totalDay,
		totalDayUp,
		ytd,
		ytdUp,
		rows: [],
		other: '',
		otherColor: '',
		slices: []
	};
	if (vm.totalPnl !== '—') vm.metaDescription = `Total return ${vm.totalPnl}. Allocation and returns, shared from Norviq.`;
	(share.holdings ?? []).forEach((holding, i) => {
		const [pnl, pnlPositive] = formatSharePct(holding.unrealizedPnlPercent);
		const [day, dayPositive] = formatSharePct(holding.dayChangePercent);
		const color = allocationColor(i);
		vm.rows.push({ symbol: holding.symbol, color, weight: formatFloat(holding.weightPercent, 1) + '%', pnl, pnlPositive, day, dayPositive });
		vm.slices.push({ label: holding.symbol, weight: holding.weightPercent, color });
	});
	if (share.otherWeightPercent != null) {
		vm.other = formatFloat(share.otherWeightPercent, 1) + '%';
		vm.otherColor = shareOtherColor;
		vm.slices.push({ label: 'Other', weight: share.otherWeightPercent, color: shareOtherColor });
	}
	return vm;
}
