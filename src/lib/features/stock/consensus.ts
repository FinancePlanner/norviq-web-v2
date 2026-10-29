// mapGradesConsensus (stock_detail_market_depth.go).
import type { components } from '#lib/api/schema.js';
import { formatFloat } from '#lib/format.js';
import { emptyConsensus, type ConsensusBucketVM, type ConsensusVM } from './types.js';

export type GradesConsensusResponse = components['schemas']['GradesConsensusResponse'];

export function mapGradesConsensus(rows: GradesConsensusResponse[]): ConsensusVM {
	if (rows.length === 0) return emptyConsensus();
	const row = rows[0];
	const buckets: ConsensusBucketVM[] = [
		{ label: 'Strong buy', count: row.strongBuy ?? 0 },
		{ label: 'Buy', count: row.buy ?? 0 },
		{ label: 'Hold', count: row.hold ?? 0 },
		{ label: 'Sell', count: row.sell ?? 0 },
		{ label: 'Strong sell', count: row.strongSell ?? 0 }
	];
	let total = 0;
	let bullish = 0;
	buckets.forEach((b, i) => {
		total += b.count;
		if (i <= 1) bullish += b.count;
	});
	if (total === 0) return emptyConsensus();
	const vm: ConsensusVM = {
		...emptyConsensus(),
		hasData: true,
		totalRatings: total,
		bullishPct: formatFloat((bullish / total) * 100, 0) + '%',
		buckets
	};
	const c = (row.consensus ?? '').trim();
	if (c) vm.consensus = c;
	return vm;
}
