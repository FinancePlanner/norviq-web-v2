// pages/portfolio/viewmodel_targets.go

export interface TargetRowVM {
	id: string;
	symbol: string;
	/** "Base", "Bull", "Bear" */
	scenario: string;
	targetPrice: string;
	highPrice: string;
	lowPrice: string;
	rationale: string;
	date: string;
}

export interface TargetFormVM {
	id: string;
	symbol: string;
	scenario: string;
	targetPrice: string;
	highPrice: string;
	lowPrice: string;
	rationale: string;
	targetDate: string;
	isEdit: boolean;
	error: string;
}

export function emptyTargetForm(over: Partial<TargetFormVM> = {}): TargetFormVM {
	return { id: '', symbol: '', scenario: '', targetPrice: '', highPrice: '', lowPrice: '', rationale: '', targetDate: '', isEdit: false, error: '', ...over };
}
