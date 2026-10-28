import { isAPIError } from '#lib/server/api.js';

// Hand-written backend shapes the Go web uses for managed portfolios and
// retirement plans (internal/api/portfolio_reporting.go), plus the small form
// helpers its handlers share (portfolio_workspace.go, retirement.go).

export interface PortfolioCapabilities {
	canView: boolean;
	canEdit: boolean;
	canManageMembers: boolean;
	canManageConnections: boolean;
	canArchive: boolean;
	canDelete: boolean;
}

export interface ManagedPortfolio {
	id: string;
	ownerUserId?: string;
	name: string;
	purpose: string;
	ownership: string;
	mode: string;
	baseCurrency: string;
	isDefault?: boolean;
	sourcePortfolioId?: string;
	currentUserRole: string;
	capabilities: PortfolioCapabilities;
	createdAt?: string;
}

export interface PortfolioPage {
	items: ManagedPortfolio[];
}

export interface PortfolioMember {
	id: string;
	displayName: string;
	email: string;
	role: string;
	status: string;
}

export interface PortfolioInvitation {
	id: string;
	email: string;
	role: string;
	status: string;
	expiresAt: string;
}

export interface PortfolioCashPosition {
	id: string;
	label: string;
	currency: string;
	balance: number;
	asOf: string;
}

export interface RetirementAccountPlan {
	id: string;
	name: string;
	wrapper: string;
	currentBalance: number;
	employeeAnnualContribution: number;
	annualFeeRate: number;
}

export interface RetirementPensionIncome {
	annualAmount: number;
	startAge: number;
	annualIndexationRate: number;
	currency: string;
}

export interface RetirementPlanInput {
	jurisdiction: string;
	currency: string;
	currentAge: number;
	retirementAge: number;
	longevityAge: number;
	annualSalary: number;
	annualSalaryGrowthRate: number;
	desiredAnnualSpending: number;
	inflationRate: number;
	expectedAnnualReturn: number;
	annualVolatility: number;
	annualContributionGrowthRate: number;
	withdrawalStrategy: string;
	withdrawalRate?: number;
	accounts: RetirementAccountPlan[];
	publicPension?: RetirementPensionIncome;
	otherAnnualRetirementIncome: number;
}

export interface RetirementPlan {
	id: string;
	portfolioId: string;
	ruleVersion: string;
	newerRuleVersion: string;
	input: RetirementPlanInput;
}

export interface RetirementProjection {
	id: string;
	ruleVersion: string;
	currency: string;
	summary: {
		readinessProbability: number;
		sustainableAnnualSpending: number;
		projectedAnnualRetirementIncome: number;
		annualContributionHeadroom: number;
		medianValueAtRetirement: number;
		medianValueAtLongevityAge: number;
	};
	warnings: string[] | null;
	assumptions: string[] | null;
}

const STATUS_TEXT: Record<number, string> = {
	400: 'Bad Request',
	401: 'Unauthorized',
	402: 'Payment Required',
	403: 'Forbidden',
	404: 'Not Found',
	409: 'Conflict',
	422: 'Unprocessable Entity',
	429: 'Too Many Requests',
	500: 'Internal Server Error',
	502: 'Bad Gateway',
	503: 'Service Unavailable',
	504: 'Gateway Timeout'
};

/**
 * portfolioAPIErrorMessage: the backend reason (Go APIError.Error() falls back
 * to the HTTP status text); a bare 500 uses the fallback.
 */
export function portfolioAPIErrorMessage(err: unknown, fallback: string): string {
	if (!err) return fallback;
	let message: string;
	if (isAPIError(err)) message = err.reason.trim() || STATUS_TEXT[err.status] || '';
	else message = err instanceof Error ? err.message.trim() : String(err).trim();
	if (message !== '' && message !== STATUS_TEXT[500]) return message;
	return fallback;
}

/** formChoice: the value when allowed, else the first allowed one. */
export function formChoice(value: FormDataEntryValue | null, ...allowed: string[]): string {
	const v = typeof value === 'string' ? value : '';
	return allowed.includes(v) ? v : allowed[0];
}

/** r.FormValue: a string, '' when absent. */
export const formValue = (form: FormData, name: string) => {
	const v = form.get(name);
	return typeof v === 'string' ? v : '';
};

/** api.ParseFloat (strconv.ParseFloat, errors → 0). */
export function parseFloatGo(value: string): number {
	const v = value.trim();
	if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(v)) return 0;
	return Number(v);
}

/** api.ParseInt (strconv.Atoi, errors → 0). */
export function parseIntGo(value: string): number {
	const v = value.trim();
	return /^[+-]?\d+$/.test(v) ? Number(v) : 0;
}

/** api.EscapePath (url.PathEscape). */
export const escapePath = (value: string) => encodeURIComponent(value);

/** Go url.Values.Encode: keys sorted, QueryEscape (space → +). */
export function encodeQuery(values: Record<string, string>): string {
	const params = new URLSearchParams();
	for (const k of Object.keys(values).sort()) params.set(k, values[k]);
	return params.toString();
}
