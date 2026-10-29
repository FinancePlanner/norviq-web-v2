import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadHoldingsQuoteRows } from '#lib/features/portfolio/holdings/holdings.server.js';
import { quoteRefreshStatusTime } from '#lib/features/portfolio/market.server.js';
import type { PositionQuoteVM } from '#lib/features/portfolio/holdings/types.js';

// GET /portfolio/quotes — PortfolioHoldingsQuotes. Go answered out-of-band
// PositionQuote fragments plus the "Updated" line; this answers their data.
export const GET: RequestHandler = async (event) => {
	let rows;
	try {
		rows = await loadHoldingsQuoteRows(event);
	} catch {
		return text('Failed to render quote updates', { status: 500 });
	}
	const quotes: PositionQuoteVM[] = rows.map((r) => ({
		id: r.id,
		marketValue: r.marketValue,
		changePositive: r.changePositive,
		todayGL: r.todayGL,
		chgPct: r.chgPct,
		totalPositive: r.totalPositive,
		totalGL: r.totalGL,
		totalGLPct: r.totalGLPct
	}));
	return json({ quotes, updatedAt: quoteRefreshStatusTime(new Date()) }, { headers: { 'cache-control': 'no-store' } });
};
