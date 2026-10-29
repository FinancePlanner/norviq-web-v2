// pages/stock/viewmodel.go — the pieces shared across tabs. Tab-specific view
// models live next to their tab (analysis/, builder/, tabs.ts).

/** ConsensusVM summarizes analyst recommendation mix. */
export interface ConsensusVM {
	hasData: boolean;
	error: string;
	consensus: string;
	totalRatings: number;
	bullishPct: string;
	buckets: ConsensusBucketVM[];
}

export interface ConsensusBucketVM {
	label: string;
	count: number;
}

/** StatementRowVM is one label/value row in a statements table. */
export interface StatementRowVM {
	label: string;
	value: string;
}

export const emptyConsensus = (): ConsensusVM => ({ hasData: false, error: '', consensus: '', totalRatings: 0, bullishPct: '', buckets: [] });
