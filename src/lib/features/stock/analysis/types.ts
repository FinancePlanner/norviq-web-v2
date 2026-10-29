// pages/stock/viewmodel.go — AnalysisTabVM and friends (Analysis tab).
// Plain serializable data: the growth sparklines carry their points, and the
// component draws them with <GrowthSparkline> (Go stored the SVG string).
import type { GrowthSparklinePoint } from '#lib/charts/growth-sparkline.js';
import { emptyConsensus, type ConsensusVM } from '../types.js';

/** AnalysisTabVM holds fundamental analysis metrics. */
export interface AnalysisTabVM {
	hasData: boolean;
	/** Never set by the Go loader; kept for shape parity. */
	error: string;
	kpis: AnalysisMetricVM[];
	sections: AnalysisSectionVM[];
	estimates: AnalysisEstimateRowVM[];
	consensus: ConsensusVM;
	dcf: DCFCardVM;
	dcfBand: DCFBandVM;
}

/** AnalysisSectionVM groups related metrics under a terminal section. */
export interface AnalysisSectionVM {
	id: string;
	title: string;
	subtitle: string;
	metrics: AnalysisMetricVM[];
	growthSparklines: GrowthSparklineVM[];
}

/** GrowthSparklineVM is a multi-year YoY growth mini chart. */
export interface GrowthSparklineVM {
	label: string;
	latest: string;
	tone: string;
	yearStart: string;
	yearEnd: string;
	/** Input of charts.GrowthSparklineSVG(points, tone). */
	points: GrowthSparklinePoint[];
}

/** AnalysisMetricVM is one labeled value with optional tone for growth coloring. */
export interface AnalysisMetricVM {
	label: string;
	value: string;
	hint: string;
	tone: string;
}

/** AnalysisEstimateRowVM is one forward estimate period row. */
export interface AnalysisEstimateRowVM {
	period: string;
	revenue: string;
	eps: string;
	ebitda: string;
	netIncome: string;
	analystsEPS: string;
}

/** DCFBandVM powers the fair-value range visualization. */
export interface DCFBandVM {
	hasData: boolean;
	bearLabel: string;
	baseLabel: string;
	bullLabel: string;
	currentLabel: string;
	markerPct: number;
	upsideLabel: string;
	downsideLabel: string;
}

/** DCFCardVM summarizes discounted cash flow estimates. */
export interface DCFCardVM {
	hasData: boolean;
	bear: string;
	base: string;
	bull: string;
	current: string;
}

export const emptyDCFBand = (): DCFBandVM => ({
	hasData: false,
	bearLabel: '',
	baseLabel: '',
	bullLabel: '',
	currentLabel: '',
	markerPct: 0,
	upsideLabel: '',
	downsideLabel: ''
});

export const emptyDCFCard = (): DCFCardVM => ({ hasData: false, bear: '', base: '', bull: '', current: '' });

/** The zero AnalysisTabVM (what Go's DetailViewModel held before the loader ran). */
export const emptyAnalysisTab = (): AnalysisTabVM => ({
	hasData: false,
	error: '',
	kpis: [],
	sections: [],
	estimates: [],
	consensus: emptyConsensus(),
	dcf: emptyDCFCard(),
	dcfBand: emptyDCFBand()
});
