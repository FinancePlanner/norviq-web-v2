import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { parseUUID } from '#lib/features/dashboard/goals/form.server.js';
import { buildGoalProgressPDF, safeGoalFilename } from '#lib/features/dashboard/goals/pdf.js';
import type { GoalPlan, PlanningGoalProgress } from '#lib/features/dashboard/goals/types.js';

// GET /goals/{id}/report.pdf → FinancialGoalPDF (goal_planning_pdf.go). The Go
// web renders the PDF itself; see pdf.ts for the fpdf subset it uses.
export const GET: RequestHandler = async (event) => {
	const id = parseUUID(event.params.id);
	if (!id) return text('Invalid financial goal\n', { status: 400 });
	const base = `/v1/financial-goals/${encodeURIComponent(id)}`;
	let goal: GoalPlan;
	try {
		goal = await apiJSON<GoalPlan>(event, 'GET', base);
	} catch {
		return text('Could not load financial goal\n', { status: 502 });
	}
	let progress: PlanningGoalProgress;
	try {
		progress = await apiJSON<PlanningGoalProgress>(event, 'GET', base + '/progress');
	} catch {
		return text('Could not load goal projection\n', { status: 502 });
	}
	let body: Uint8Array;
	try {
		body = buildGoalProgressPDF(goal, progress);
	} catch {
		return text('Could not generate report\n', { status: 500 });
	}
	return new Response(body as Uint8Array<ArrayBuffer>, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${safeGoalFilename(goal.name)}-goal-report.pdf"`
		}
	});
};
