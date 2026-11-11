// Mirrors norviq-backend-v2 internal/features/digest/dto.go (DigestResponse).

export interface DigestCurrencyMove {
	currency: string;
	startValue: number;
	endValue: number;
	change: number;
	changePercent?: number | null;
}

export interface DigestMover {
	symbol: string;
	currency: string;
	shares: number;
	startPrice: number;
	endPrice: number;
	contribution: number;
	changePercent: number;
	why?: string | null;
}

export interface DigestBudgetLine {
	title: string;
	target: number;
	actual: number;
	drift: number;
	driftPercent?: number | null;
}

export interface DigestBudget {
	monthStart: string;
	currency: string;
	lines: DigestBudgetLine[];
}

export interface DigestInflation {
	country: string;
	asOf: string;
	personalRate: number;
	officialRate: number;
}

export interface DigestEarning {
	symbol: string;
	date: string;
	hour?: string | null;
}

export interface DigestPayload {
	schemaVersion: number;
	periodStart: string;
	periodEnd: string;
	holdings: DigestCurrencyMove[];
	pricedPositions: number;
	totalPositions: number;
	movers: DigestMover[];
	budget?: DigestBudget | null;
	inflation?: DigestInflation | null;
	inflationAsOfSeen?: string | null;
	earnings: DigestEarning[];
}

export interface DigestResponse {
	id: string;
	periodStart: string;
	periodEnd: string;
	status: string;
	headline: string;
	payload: DigestPayload;
	narrative?: string | null;
	createdAt?: string | null;
}
