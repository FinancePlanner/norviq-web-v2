import type { components } from '#lib/api/schema.js';

// Shapes of the tax endpoints. The Go web uses the generated client for every
// tax call (internal/api/client.gen.go), so the spec types match what it reads.

type S = components['schemas'];

export type TaxMoney = S['TaxMoney'];
export type TaxDashboardResponse = S['TaxDashboardResponse'];
export type TaxOpportunityResponse = S['TaxOpportunityResponse'];
export type TaxLocationOpportunity = S['TaxLocationOpportunity'];
export type TaxProfileContextResponse = S['TaxProfileContextResponse'];
export type TaxProfileRequest = S['TaxProfileRequest'];
export type TaxInstrumentMarketOption = S['TaxInstrumentMarketOption'];
export type TaxFundLotOption = S['TaxFundLotOption'];
export type TaxLossCarryforwardLedgerResponse = S['TaxLossCarryforwardLedgerResponse'];
export type TaxLossCarryforwardBalanceResponse = S['TaxLossCarryforwardBalanceResponse'];
export type TaxNotificationPreferences = S['TaxNotificationPreferences'];
export type TaxReportResponse = S['TaxReportResponse'];
export type TaxActionPlanResponse = S['TaxActionPlanResponse'];
export type TaxScenarioResponse = S['TaxScenarioResponse'];
export type TaxLocationScenarioResponse = S['TaxLocationScenarioResponse'];
export type FilingPackPreviewResponse = S['FilingPackPreviewResponse'];
export type FilingPackSection = S['FilingPackSection'];

/** tax.PageViewModel */
export interface TaxPageViewModel {
	dashboard: TaxDashboardResponse;
	context: TaxProfileContextResponse;
	carryforwards: TaxLossCarryforwardLedgerResponse | null;
	notifications: TaxNotificationPreferences;
	reports: TaxReportResponse[];
	actionPlans: TaxActionPlanResponse[];
	jurisdiction: string;
	taxYear: number;
	isPro: boolean;
	errorMessage: string;
	accountFilter: string;
	assetFilter: string;
	statusFilter: string;
	assetClasses: string[];
}

/** tax.FilingViewModel */
export interface FilingViewModel {
	taxYear: number;
	years: number[];
	jurisdiction: string;
	isPro: boolean;
	/** Set when the backend returned 200. */
	preview: FilingPackPreviewResponse | null;
	/** The backend's 409: no complete tax profile for the year. */
	profileIncomplete: boolean;
	/** The backend's 422: no mapper for the jurisdiction yet. */
	unsupported: boolean;
	errorMessage: string;
	/** Web checkout link for buying just this year's pack; '' when not configured. */
	taxPackURL: string;
	/** A tax year that has not ended: the numbers still move. */
	provisional: boolean;
}

/** What the workspace-targeted actions (Go: hx-target="#tax-workspace") return. */
export type TaxWorkspace =
	| { kind: 'scenario'; scenario: TaxScenarioResponse }
	| { kind: 'location'; scenario: TaxLocationScenarioResponse }
	| { kind: 'plan'; plan: TaxActionPlanResponse };
