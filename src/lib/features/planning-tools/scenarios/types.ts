// Shapes for the /scenarios port (norviq-web internal/handlers/scenarios.go,
// internal/api/service.go FetchScenarioWorkspace, internal/pages/scenarios).
// The Go web uses the generated client for every call here, so the spec
// types match what it decoded.
import type { components } from '#lib/api/schema.js';

type S = components['schemas'];

export type ScenarioRun = S['ScenarioRun'];
export type ScenarioCatalog = S['ScenarioCatalog'];
export type ScenarioCatalogItem = S['ScenarioCatalogItem'];
export type ScenarioDefinition = S['ScenarioDefinition'];
export type ScenarioSnapshot = S['ScenarioSnapshot'];
export type HoldingRiskProfile = S['HoldingRiskProfile'];
export type HoldingRiskProfileInput = S['HoldingRiskProfileInput'];
export type ScenarioInput = S['ScenarioInput'];
export type ScenarioRunInput = S['ScenarioRunInput'];
export type ScenarioSnapshotInput = S['ScenarioSnapshotInput'];
export type ScenarioJSON = S['ScenarioJSON'];

/** api.ScenarioWorkspace, trimmed to the fields the page reads. */
export interface ScenarioWorkspace {
	catalog: ScenarioCatalog;
	runs: ScenarioRun[];
	portfolios: { id: string; name: string }[];
	goals: { id: string; name: string }[];
	scenarios: ScenarioDefinition[];
	holdings: { id: string; symbol: string; category: string }[];
	cryptoHoldings: { id: string; symbol: string; quantity: number }[];
	riskProfiles: HoldingRiskProfile[];
}

export const emptyWorkspace = (): ScenarioWorkspace => ({
	catalog: { version: '', historicalScenarios: [] },
	runs: [],
	portfolios: [],
	goals: [],
	scenarios: [],
	holdings: [],
	cryptoHoldings: [],
	riskProfiles: []
});

/** The submitted form, as Go's r.Form (name → values), echoed back as hidden inputs. */
export type FormValues = [name: string, value: string][];

/**
 * JSON bodies of the fragment endpoints. The Go handlers answered with HTML
 * fragments; v2 answers with the data and the page renders the same markup.
 */
export type SnapshotReviewResponse = { snapshot: ScenarioSnapshot; values: FormValues };
export type FormErrorResponse = { formError: string };
export type RedirectResponse = { redirect: string };
export type CompareResponse = { runs: ScenarioRun[] };
