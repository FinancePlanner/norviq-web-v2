import {
	buildSentimentBadge,
	sentimentCoverageLabel,
	type SentimentBadgeVM
} from '#lib/components/norviq/sentiment.js';

// pages/portfolio/sentiment_rollup.go — retail sentiment across a whole
// portfolio or watchlist. Coverage is always shown with the score.

export interface SentimentRollupVM {
	show: boolean;
	badge: SentimentBadgeVM;
	coverageLabel: string;
	coverageThin: boolean;
	mostBullish: string;
	mostBearish: string;
	asOf: string;
}

/** ThinCoverageThreshold */
export const THIN_COVERAGE_THRESHOLD = 0.5;

export function buildSentimentRollup(
	label: string,
	score: number | null | undefined,
	coverage: number,
	covered: number,
	total: number,
	postCount: number,
	mostBullish: string,
	mostBearish: string,
	asOf: string
): SentimentRollupVM {
	if (total === 0) {
		return {
			show: false,
			badge: buildSentimentBadge('', null, null, 0),
			coverageLabel: '',
			coverageThin: false,
			mostBullish: '',
			mostBearish: '',
			asOf: ''
		};
	}
	return {
		show: true,
		badge: buildSentimentBadge(label, score, null, postCount),
		coverageLabel: sentimentCoverageLabel(covered, total),
		coverageThin: coverage < THIN_COVERAGE_THRESHOLD,
		mostBullish: mostBullish ? `Most bullish: ${mostBullish}` : '',
		mostBearish: mostBearish ? `Most bearish: ${mostBearish}` : '',
		asOf
	};
}
