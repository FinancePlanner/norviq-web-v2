import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createSnapshot,
	formError,
	formValue,
	parseInt64,
	parseUUID,
	queueRun,
	readForm,
	requireScenarioPlanning
} from '#lib/features/planning-tools/scenarios/form.server.js';
import { uid } from '#lib/features/planning-tools/scenarios/view.js';
import type { RedirectResponse } from '#lib/features/planning-tools/scenarios/types.js';

// POST /scenarios/configurations/{id}/runs → ScenarioDefinitionRun. Posted by
// the snapshot review of a saved scenario. Answers { redirect } (Go: 201 +
// HX-Redirect /scenarios?run=<id>).
export const POST: RequestHandler = async (event) => {
	await requireScenarioPlanning(event);
	const form = await readForm(event);
	const scenarioID = parseUUID(event.params.id);
	if (!scenarioID) return formError('The saved scenario is invalid.');
	const portfolioID = parseUUID(formValue(form, 'portfolioId'));
	if (!portfolioID) return formError('The saved scenario portfolio is invalid.');
	let snapshotID: string;
	const rawSnapshotID = formValue(form, 'snapshotId').trim();
	if (rawSnapshotID !== '') {
		const parsed = parseUUID(rawSnapshotID);
		if (!parsed) return formError('The reviewed snapshot is invalid.');
		snapshotID = parsed;
	} else {
		// Go sends no cryptoHoldingIds on this path.
		try {
			snapshotID = uid((await createSnapshot(event, portfolioID, form, undefined)).id);
		} catch {
			return formError('The portfolio snapshot could not be captured.');
		}
	}
	let seed: number | null = null;
	const rawSeed = formValue(form, 'seed').trim();
	if (rawSeed !== '') {
		seed = parseInt64(rawSeed);
		if (seed === null) return formError('Seed must be a whole number.');
	}
	try {
		const run = await queueRun(event, scenarioID, snapshotID, seed);
		return json({ redirect: '/scenarios?run=' + uid(run.id) } satisfies RedirectResponse, {
			status: 201
		});
	} catch {
		return formError('The saved scenario could not be queued.');
	}
};
