// pages/earningsviz/viewmodel.go — the income-statement earnings flow visualizer.
// Shared by /portfolio/earnings and the stock earnings tab.

export interface FilingOptionVM {
	label: string;
	value: string;
	selected: boolean;
}

export interface FlowMetricVM {
	label: string;
	value: string;
	subtext: string;
	tone: string;
	/** A CSS length ("132px") despite the Go name. */
	widthPercent: string;
	visible: boolean;
}

export interface VisualizerVM {
	symbol: string;
	inputSymbol: string;
	action: string;
	filing: string;
	filingLabel: string;
	currency: string;
	eps: string;
	hasData: boolean;
	error: string;
	filings: FilingOptionVM[];

	revenue: FlowMetricVM;
	grossProfit: FlowMetricVM;
	costOfRevenue: FlowMetricVM;
	operatingIncome: FlowMetricVM;
	operatingExpenses: FlowMetricVM;
	researchDev: FlowMetricVM;
	sga: FlowMetricVM;
	tax: FlowMetricVM;
	other: FlowMetricVM;
	netIncome: FlowMetricVM;
}

export const emptyFlowMetric = (): FlowMetricVM => ({ label: '', value: '', subtext: '', tone: '', widthPercent: '', visible: false });

export function emptyVisualizer(): VisualizerVM {
	return {
		symbol: '',
		inputSymbol: '',
		action: '',
		filing: '',
		filingLabel: '',
		currency: '',
		eps: '',
		hasData: false,
		error: '',
		filings: [],
		revenue: emptyFlowMetric(),
		grossProfit: emptyFlowMetric(),
		costOfRevenue: emptyFlowMetric(),
		operatingIncome: emptyFlowMetric(),
		operatingExpenses: emptyFlowMetric(),
		researchDev: emptyFlowMetric(),
		sga: emptyFlowMetric(),
		tax: emptyFlowMetric(),
		other: emptyFlowMetric(),
		netIncome: emptyFlowMetric()
	};
}
