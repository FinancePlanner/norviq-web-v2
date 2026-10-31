import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import {
	httpError,
	parseUUID,
	requireScenarioPlanning
} from '#lib/features/planning-tools/scenarios/form.server.js';
import { buildScenarioPDF } from '#lib/features/planning-tools/scenarios/pdf.js';
import type { ScenarioJSON, ScenarioRun } from '#lib/features/planning-tools/scenarios/types.js';

// GET /scenarios/runs/{id}/report.pdf → ScenarioRunPDF (scenario_pdf.go). The
// Go web draws the PDF itself; see features/planning-tools/scenarios/pdf.ts.
export const GET: RequestHandler = async (event) => {
	await requireScenarioPlanning(event);
	const id = parseUUID(event.params.id);
	if (!id) return httpError('Invalid run', 400);
	let run: ScenarioRun | undefined;
	try {
		run = await apiJSON<ScenarioRun>(event, 'GET', `/v1/scenario-runs/${id}`);
	} catch {
		run = undefined;
	}
	if (!run || run.state !== 'completed') return httpError('Completed run unavailable', 404);
	let result: ScenarioJSON | undefined;
	try {
		result = await apiJSON<ScenarioJSON>(event, 'GET', `/v1/scenario-runs/${id}/result`);
	} catch {
		result = undefined;
	}
	if (!result) return httpError('Scenario result unavailable', 404);
	let body: Uint8Array;
	try {
		body = buildScenarioPDF(run, result);
	} catch {
		return httpError('PDF generation failed', 500);
	}
	return new Response(body as Uint8Array<ArrayBuffer>, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="norviq-scenario-${id}.pdf"`
		}
	});
};
