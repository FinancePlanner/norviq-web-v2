import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { httpError, parseUUID, requireScenarioPlanning } from '#lib/features/planning-tools/scenarios/form.server.js';
import type { ScenarioRun } from '#lib/features/planning-tools/scenarios/types.js';

// GET /scenarios/runs/{id} → ScenarioRunStatus. Go returned the RunCard
// fragment (polled every 2s by an active card); v2 returns the run as JSON
// and RunCard.svelte polls it with TanStack Query. Kept at this URL so the
// Scenario planning gate still covers the poll.
export const GET: RequestHandler = async (event) => {
	await requireScenarioPlanning(event);
	const id = parseUUID(event.params.id);
	if (!id) return httpError('Invalid run', 400);
	try {
		const run = await apiJSON<ScenarioRun>(event, 'GET', `/v1/scenario-runs/${id}`);
		if (!run) return httpError('Run unavailable', 502);
		return json(run);
	} catch {
		return httpError('Run unavailable', 502);
	}
};

// DELETE /scenarios/runs/{id} → ScenarioRunCancel: cancel, then return the
// updated run (Go: the re-rendered RunCard).
export const DELETE: RequestHandler = async (event) => {
	await requireScenarioPlanning(event);
	const id = parseUUID(event.params.id);
	if (!id) return httpError('Invalid run', 400);
	try {
		await apiJSON(event, 'DELETE', `/v1/scenario-runs/${id}`);
	} catch {
		return httpError('Run could not be canceled', 502);
	}
	try {
		const run = await apiJSON<ScenarioRun>(event, 'GET', `/v1/scenario-runs/${id}`);
		if (!run) return httpError('Canceled run could not be loaded', 502);
		return json(run);
	} catch {
		return httpError('Canceled run could not be loaded', 502);
	}
};
