import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import {
	createSnapshot,
	defaultString,
	formError,
	formValue,
	parseInt64,
	parseUUID,
	queueRun,
	readForm,
	requireScenarioPlanning,
	scenarioConfiguration,
	scenarioCryptoHoldingIDs
} from '#lib/features/planning-tools/scenarios/form.server.js';
import { uid } from '#lib/features/planning-tools/scenarios/view.js';
import type { RedirectResponse, ScenarioDefinition, ScenarioJSON } from '#lib/features/planning-tools/scenarios/types.js';

// POST /scenarios/runs → ScenarioCreateRun. Posted by the snapshot review's
// "Run reviewed snapshot" form. Go answered 201 + HX-Redirect; v2 answers
// { redirect } and the page navigates there.
export const POST: RequestHandler = async (event) => {
	await requireScenarioPlanning(event);
	const form = await readForm(event);
	const portfolioID = parseUUID(formValue(form, 'portfolioId'));
	if (!portfolioID) return formError('Choose a portfolio.');
	const kind = formValue(form, 'kind').trim();
	let configuration: ScenarioJSON;
	try {
		configuration = scenarioConfiguration(form, kind);
	} catch (err) {
		return formError((err as Error).message);
	}
	let snapshotID: string;
	const rawSnapshotID = formValue(form, 'snapshotId').trim();
	if (rawSnapshotID !== '') {
		const parsed = parseUUID(rawSnapshotID);
		if (!parsed) return formError('The reviewed snapshot is invalid.');
		snapshotID = parsed;
	} else {
		const cryptoHoldingIDs = scenarioCryptoHoldingIDs(form);
		if (!cryptoHoldingIDs) return formError('Choose valid crypto holdings.');
		try {
			snapshotID = uid((await createSnapshot(event, portfolioID, form, cryptoHoldingIDs)).id);
		} catch {
			return formError('The portfolio snapshot could not be captured.');
		}
	}
	const input: {
		name: string;
		portfolioListId: string;
		kind: string;
		configuration: ScenarioJSON;
		financialGoalId?: string;
		isSaved: boolean;
	} = {
		name: defaultString(formValue(form, 'name'), 'Portfolio stress test'),
		portfolioListId: portfolioID,
		kind,
		configuration,
		isSaved: false
	};
	const goal = formValue(form, 'financialGoalId');
	if (goal !== '') {
		const id = parseUUID(goal);
		if (!id) return formError('Choose a valid financial goal.');
		input.financialGoalId = id;
	}
	input.isSaved = formValue(form, 'isSaved') === 'true';
	let scenario: ScenarioDefinition;
	try {
		scenario = await apiJSON<ScenarioDefinition>(event, 'POST', '/v1/scenarios', input);
	} catch {
		return formError('The scenario configuration could not be saved.');
	}
	let seed = 0;
	const rawSeed = formValue(form, 'seed').trim();
	if (rawSeed !== '') {
		const parsed = parseInt64(rawSeed);
		if (parsed === null) return formError('Seed must be a whole number.');
		seed = parsed;
	}
	try {
		const run = await queueRun(event, uid(scenario.id), snapshotID, seed !== 0 ? seed : null);
		return json({ redirect: '/scenarios?run=' + uid(run.id) } satisfies RedirectResponse, { status: 201 });
	} catch {
		return formError('The scenario run could not be queued.');
	}
};
