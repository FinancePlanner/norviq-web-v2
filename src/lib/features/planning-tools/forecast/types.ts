// Shapes for the /forecast port (norviq-web internal/handlers/wealth_automation.go
// NetWorthForecast*, internal/pages/automation ForecastPage). The Go web uses
// the generated client here, so the spec types are what it decoded.
import type { components } from '#lib/api/schema.js';

type S = components['schemas'];

export type NetWorthForecastDefinition = S['NetWorthForecastDefinition'];
export type NetWorthForecastDefaults = S['NetWorthForecastDefaults'];
export type NetWorthForecastRun = S['NetWorthForecastRun'];
export type NetWorthForecastUpsertRequest = S['NetWorthForecastUpsertRequest'];

/** automation.ForecastVM */
export interface ForecastVM {
	portfolios: { id: string; name: string }[];
	forecasts: NetWorthForecastDefinition[];
	defaults: NetWorthForecastDefaults | null;
	run: NetWorthForecastRun | null;
	editing: NetWorthForecastDefinition | null;
	error: string;
}
