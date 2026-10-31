// Port of norviq-web internal/handlers/reports_deepdive.go. Every report is
// gated on the "statistics" feature (server.go requireStatistics).

import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { formatCurrency, formatFloat, formatSignedCurrency } from '#lib/format.js';
import { getJSON } from '#lib/features/dashboard/fetch.server.js';
import { mapSectorAllocationsForReports } from './load.server.js';
import type { DeepDiveReportVM } from './types.js';

export interface DeepDiveReportDef {
	title: string;
	description: string;
	path: string;
}

/** The eight deep-dive routes: slug → title, description, backend path. */
export const deepDiveReports: Record<string, DeepDiveReportDef> = {
	calendar: {
		title: 'Calendar Performance',
		description: 'Analyze historical returns by day and month.',
		path: '/v1/statistics/stocks/calendar-performance'
	},
	contribution: {
		title: 'Contribution Analysis',
		description: 'See which assets drove your portfolio returns.',
		path: '/v1/statistics/stocks/contribution-analysis'
	},
	currency: {
		title: 'Currency Split',
		description: 'View portfolio exposure by fiat currency.',
		path: '/v1/statistics/stocks/currency-split'
	},
	notes: {
		title: 'Notes Quality',
		description: 'Analyze the depth and recency of your research.',
		path: '/v1/statistics/stocks/notes-quality'
	},
	sectors: {
		title: 'Sector Allocation',
		description: 'Breakdown of exposure across market sectors.',
		path: '/v1/statistics/stocks/sector-allocation'
	},
	scorecard: {
		title: 'Stock Scorecard',
		description: 'Comprehensive metrics for individual holdings.',
		path: '/v1/statistics/stocks/scorecard'
	},
	volatility: {
		title: 'Volatility Snapshot',
		description: 'Understand portfolio risk and beta.',
		path: '/v1/statistics/stocks/volatility-snapshot'
	},
	winners: {
		title: 'Winners vs. Losers',
		description: 'Compare top performing assets against laggards.',
		path: '/v1/statistics/stocks/winners-losers'
	}
};

/** serveDeepDiveReport: only three shapes render rows; the rest say "Report generated successfully." */
export async function loadDeepDiveReport(
	event: RequestEvent,
	def: DeepDiveReportDef
): Promise<DeepDiveReportVM> {
	const vm: DeepDiveReportVM = {
		title: def.title,
		description: def.description,
		dataAvailable: false,
		calendar: [],
		sectors: [],
		stocks: []
	};
	const res = await getJSON<components['schemas']['StatisticsDTO']>(event, def.path);
	const stats = res.data;
	if (!stats) return vm;
	const imported = stats.importedStocks;
	if (def.title === 'Calendar Performance' && imported.calendarPerformance?.length > 0) {
		vm.dataAvailable = true;
		vm.calendar = imported.calendarPerformance.map((day) => ({
			date: day.date,
			pnlPercent: formatFloat(day.pnlPercent, 2) + '%',
			positive: day.pnlPercent >= 0
		}));
	} else if (def.title === 'Sector Allocation' && imported.sectorAllocations?.length > 0) {
		vm.dataAvailable = true;
		vm.sectors = mapSectorAllocationsForReports(imported.sectorAllocations)[0];
	} else if (
		(def.title === 'Winners vs. Losers' || def.title === 'Stock Scorecard') &&
		imported.stockSummaries?.length > 0
	) {
		vm.dataAvailable = true;
		// The DTO has no unrealized P/L percent, so Go shows the signed value.
		vm.stocks = imported.stockSummaries.map((s) => ({
			symbol: s.symbol,
			marketValue: formatCurrency(s.marketValue),
			unrealizedPnlPercent: formatSignedCurrency(s.unrealizedPnl),
			positive: s.unrealizedPnl >= 0
		}));
	}
	return vm;
}
