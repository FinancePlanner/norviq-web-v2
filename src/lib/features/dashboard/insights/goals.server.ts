// The focus-point mutations on /dashboard/insights. Ports of
// handlers/dashboard_goals.go: DashboardInsights{Create,Toggle,Update,Delete}Goal
// and lookupManualGoal. Each one, like Go's renderFocusPointsBody, ends by
// reloading the goals and reporting whether the mutation failed; the page
// renders FocusPointsBody from that result.

import type { RequestEvent } from '@sveltejs/kit';
import { apiFetch } from '#lib/server/api.js';
import type { FocusPointVM } from '../types.js';
import { loadFocusPoints } from './load.server.js';
import type { Goal } from './mappers.js';

export interface FocusPointsResult {
	focusPoints: FocusPointVM[];
	goalsError: boolean;
}

const UUID_RE = /^(?:urn:uuid:)?\{?([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})\}?$/i;

/** uuid.Parse, lowercased canonical form; null when unparseable. */
function parseUUID(raw: string): string | null {
	const m = UUID_RE.exec(raw.trim());
	return m ? m.slice(1).join('-').toLowerCase() : null;
}

/** Sends one mutation; ok only on the status Go required. */
async function send(event: RequestEvent, method: string, path: string, input: unknown, want: number, what: string) {
	try {
		const body = input === undefined ? undefined : JSON.stringify(input);
		const headers: Record<string, string> = body ? { 'Content-Type': 'application/json' } : {};
		const res = await apiFetch(event, method, path, body, { headers });
		await res.body?.cancel().catch(() => {});
		if (res.status !== want) {
			console.warn(`${what} failed`, res.status);
			return false;
		}
		return true;
	} catch (err) {
		console.warn(`${what} failed`, err);
		return false;
	}
}

/** lookupManualGoal: the goal must parse, exist, and not be system-managed. */
async function lookupManualGoal(event: RequestEvent, idParam: string): Promise<{ id: string; goal: Goal } | null> {
	const id = parseUUID(idParam);
	if (!id) return null;
	try {
		const res = await apiFetch(event, 'GET', '/v1/goals');
		if (res.status !== 200) {
			await res.body?.cancel().catch(() => {});
			return null;
		}
		const goals = ((await res.json()) as Goal[] | null) ?? [];
		const goal = goals.find((g) => g.id.toLowerCase() === id);
		if (!goal || goal.statusUpdatedBy === 'system') return null;
		return { id, goal };
	} catch (err) {
		console.warn('goal lookup failed', err);
		return null;
	}
}

async function result(event: RequestEvent, goalsError: boolean): Promise<FocusPointsResult> {
	return { focusPoints: await loadFocusPoints(event), goalsError };
}

const field = (data: FormData, name: string) => String(data.get(name) ?? '').trim();

/** POST /dashboard/insights/goals. An empty title is a silent no-op. */
export async function createGoal(event: RequestEvent, data: FormData) {
	const title = field(data, 'title');
	let goalsError = false;
	if (title !== '') goalsError = !(await send(event, 'POST', '/v1/goals', { title }, 200, 'create goal'));
	return result(event, goalsError);
}

/** POST /dashboard/insights/goals/{id}/toggle: pending ↔ completed, as a manual update. */
export async function toggleGoal(event: RequestEvent, data: FormData) {
	const found = await lookupManualGoal(event, field(data, 'id'));
	let goalsError = !found;
	if (found) {
		const status = found.goal.status === 'completed' ? 'pending' : 'completed';
		goalsError = !(await send(
			event,
			'PATCH',
			`/v1/goals/${found.id}/status`,
			{ status, source: 'manual' },
			200,
			'toggle goal status'
		));
	}
	return result(event, goalsError);
}

/** PATCH /dashboard/insights/goals/{id}: rename. */
export async function updateGoal(event: RequestEvent, data: FormData) {
	const title = field(data, 'title');
	const found = await lookupManualGoal(event, field(data, 'id'));
	let goalsError = !found || title === '';
	if (found && title !== '') {
		goalsError = !(await send(event, 'PATCH', `/v1/goals/${found.id}`, { title }, 200, 'update goal'));
	}
	return result(event, goalsError);
}

/** DELETE /dashboard/insights/goals/{id}. */
export async function deleteGoal(event: RequestEvent, data: FormData) {
	const found = await lookupManualGoal(event, field(data, 'id'));
	let goalsError = !found;
	if (found) goalsError = !(await send(event, 'DELETE', `/v1/goals/${found.id}`, undefined, 204, 'delete goal'));
	return result(event, goalsError);
}
