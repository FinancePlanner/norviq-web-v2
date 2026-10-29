import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import {
	formError,
	formValue,
	mutationRedirect,
	optionalBoundedFloat,
	parseUUID,
	readForm,
	requireScenarioPlanning,
	scenarioAssetCategory,
	scenarioOptionalString
} from '#lib/features/planning-tools/scenarios/form.server.js';
import type { HoldingRiskProfileInput } from '#lib/features/planning-tools/scenarios/types.js';

// POST /scenarios/risk-profiles → ScenarioRiskProfileSave. Go: 204 +
// HX-Redirect /scenarios, or a 422 FormError; v2: { redirect } or { formError }.
export const POST: RequestHandler = async (event) => {
	await requireScenarioPlanning(event);
	const form = await readForm(event);
	const holdingID = parseUUID(formValue(form, 'holdingId'));
	if (!holdingID) return formError('Choose a holding.');
	const category = formValue(form, 'assetCategory').trim();
	if (!scenarioAssetCategory(category)) return formError('Choose a supported asset category.');
	let manual: number | null, duration: number | null, convexity: number | null;
	try {
		manual = optionalBoundedFloat(formValue(form, 'manualValue'), 0.01, 1_000_000_000_000);
	} catch {
		return formError('Manual value must be positive.');
	}
	try {
		duration = optionalBoundedFloat(formValue(form, 'duration'), 0, 1000);
	} catch {
		return formError('Duration must be zero or greater.');
	}
	try {
		convexity = optionalBoundedFloat(formValue(form, 'convexity'), 0, 10000);
	} catch {
		return formError('Convexity must be zero or greater.');
	}
	// Optional pointers that are nil are omitted from the JSON body, as in Go.
	const input: HoldingRiskProfileInput = {
		holdingId: holdingID,
		assetCategory: category as HoldingRiskProfileInput['assetCategory']
	};
	const sector = scenarioOptionalString(formValue(form, 'sector'));
	const region = scenarioOptionalString(formValue(form, 'region'));
	const benchmarkProxy = scenarioOptionalString(formValue(form, 'benchmarkProxy').toUpperCase());
	if (sector !== null) input.sector = sector;
	if (region !== null) input.region = region;
	if (benchmarkProxy !== null) input.benchmarkProxy = benchmarkProxy;
	if (manual !== null) input.manualValue = manual;
	if (duration !== null) input.duration = duration;
	if (convexity !== null) input.convexity = convexity;
	try {
		await apiJSON(event, 'POST', '/v1/holding-risk-profiles', input);
	} catch {
		return formError('The holding risk profile could not be saved.');
	}
	return mutationRedirect();
};
