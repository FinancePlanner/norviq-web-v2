import type { Actions, PageServerLoad } from './$types';
import {
	createActionPlan,
	createLocationScenario,
	createPlacementPlan,
	createReport,
	createScenario,
	loadTaxPage,
	opportunityDecision,
	saveFundAnnualInput,
	saveFundClassification,
	saveMarketAdmission,
	saveNotifications,
	saveProfile
} from '#lib/features/money/tax/tax.server.js';

// Go: appHandler.Tax (GET /tax). The POST routes Go mounted under /tax/* are
// the actions below; /tax/filing posts its report forms to /tax?/reports.
export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	return { vm: await loadTaxPage(event, isPro) };
};

export const actions: Actions = {
	profile: saveProfile, // POST /tax/profile
	marketAdmission: saveMarketAdmission, // POST /tax/instruments/{id}/market-admission
	fundClassification: saveFundClassification, // POST /tax/instruments/{id}/fund-classification
	fundAnnualInputs: saveFundAnnualInput, // POST /tax/funds/annual-inputs
	scenarios: createScenario, // POST /tax/scenarios
	actionPlans: createActionPlan, // POST /tax/action-plans
	dismiss: (event) => opportunityDecision(event, false), // POST /tax/opportunities/{id}/dismiss
	restore: (event) => opportunityDecision(event, true), // POST /tax/opportunities/{id}/restore
	locationScenarios: createLocationScenario, // POST /tax/location-scenarios
	placementPlans: createPlacementPlan, // POST /tax/placement-plans
	notifications: saveNotifications, // POST /tax/notifications
	reports: createReport // POST /tax/reports
};
