import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { quoteRefreshStatusTime } from '#lib/features/portfolio/market.server.js';
import { loadWatchlistQuoteRows } from '#lib/features/portfolio/watchlist/watchlist.server.js';
import type { WatchlistQuotesResponse } from '#lib/features/portfolio/watchlist/types.js';

// GET /portfolio/watchlist/quotes (handlers.PortfolioWatchlistQuotes). Go
// answered with out-of-band HTML swaps for every row's price cells plus the
// "Updated hh:mm:ss" line; this answers the same data as JSON for the
// page's 20s TanStack Query poll.
export const GET: RequestHandler = async (event) => {
	const rows = await loadWatchlistQuoteRows(event, event.url.searchParams.get('list') ?? '');
	const body: WatchlistQuotesResponse = {
		updatedAt: quoteRefreshStatusTime(new Date()),
		rows: rows.map(({ id, price, netChg, changePercent, changePositive, open, prevClose, high, low }) => ({
			id,
			price,
			netChg,
			changePercent,
			changePositive,
			open,
			prevClose,
			high,
			low
		}))
	};
	return json(body, { headers: { 'cache-control': 'no-store' } });
};
