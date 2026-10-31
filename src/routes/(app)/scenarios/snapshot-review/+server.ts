import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import {
	defaultString,
	formError,
	formValue,
	parseUUID,
	requireScenarioPlanning,
	scenarioConfiguration,
	scenarioCryptoHoldingIDs
} from '#lib/features/planning-tools/scenarios/form.server.js';
import type {
	FormValues,
	ScenarioSnapshot,
	SnapshotReviewResponse
} from '#lib/features/planning-tools/scenarios/types.js';

// POST /scenarios/snapshot-review → ScenarioSnapshotReview. Go rendered the
// SnapshotReview fragment; v2 returns the snapshot plus the submitted form
// (echoed back as hidden inputs) and the page renders SnapshotReview.svelte.
export const POST: RequestHandler = async (event) => {
	await requireScenarioPlanning(event);
	let form: FormData;
	try {
		form = await event.request.formData();
	} catch {
		return formError('The scenario form is invalid.');
	}
	const portfolioID = parseUUID(formValue(form, 'portfolioId'));
	if (!portfolioID) return formError('Choose a portfolio.');
	const savedScenarioID = formValue(form, 'savedScenarioId').trim();
	if (savedScenarioID !== '') {
		if (!parseUUID(savedScenarioID)) return formError('The saved scenario is invalid.');
	} else {
		try {
			scenarioConfiguration(form, formValue(form, 'kind'));
		} catch (err) {
			return formError((err as Error).message);
		}
	}
	const cryptoHoldingIDs = scenarioCryptoHoldingIDs(form);
	if (!cryptoHoldingIDs) return formError('Choose valid crypto holdings.');
	let snapshot: ScenarioSnapshot;
	try {
		snapshot = await apiJSON<ScenarioSnapshot>(event, 'POST', '/v1/portfolio/scenario-snapshots', {
			portfolioListId: portfolioID,
			baseCurrency: defaultString(formValue(form, 'baseCurrency'), 'USD').toUpperCase(),
			cryptoHoldingIds: cryptoHoldingIDs
		});
	} catch {
		return formError('The portfolio snapshot could not be captured.');
	}
	const values: FormValues = [];
	for (const [name, value] of form.entries()) {
		if (typeof value === 'string') values.push([name, value]);
	}
	return json({ snapshot, values } satisfies SnapshotReviewResponse);
};
