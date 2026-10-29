import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import { Feature, isPro } from '#lib/billing.js';
import { formatFloat } from '#lib/format.js';
import { parseUUID } from '#lib/features/portfolio/market.server.js';
import { formValue, parseFloatGo } from '#lib/features/portfolio/workspace/api.server.js';
import { emptyTargetForm, type TargetRowVM } from '#lib/features/portfolio/workspace/targets.js';

// handlers/portfolio_targets.go — /portfolio/targets (requireTargetAlerts).
// The add/edit fragments (GET /add, GET /{id}/edit) are TargetFormModal; the
// POST / PUT /{id} / DELETE /{id}/remove handlers are the actions below.

type ScenarioTargetResponse = components['schemas']['ScenarioTargetResponse'];
type ScenarioTargetRequest = components['schemas']['ScenarioTargetRequest'];

const FEATURE_NAME = 'Price alerts';

/** requireTargetAlerts, then the handler's own `!isPro` check. */
async function gate(event: RequestEvent, onNotPro: () => never) {
	await requireFeature(event, Feature.TargetAlerts, FEATURE_NAME);
	if (!isPro(await loadBillingContext(event))) onNotPro();
}

const proRequired = (): never => error(403, 'Pro required');

export const load: PageServerLoad = async (event) => {
	await gate(event, () => redirect(303, '/dashboard'));
	let apiTargets: ScenarioTargetResponse[];
	try {
		apiTargets = await apiJSON<ScenarioTargetResponse[]>(event, 'GET', '/v1/targets');
	} catch {
		error(500, 'Failed to load targets');
	}
	const targets: TargetRowVM[] = (apiTargets ?? []).map((t) => ({
		id: t.id.toLowerCase(),
		symbol: t.symbol,
		scenario: t.scenario,
		targetPrice: formatFloat(t.targetPrice, 2),
		// Go: "Needs backend support … not mapped in response yet"
		highPrice: '0.00',
		lowPrice: '0.00',
		rationale: t.rationale ?? '',
		date: ''
	}));
	return { targets };
};

async function readForm(event: RequestEvent): Promise<FormData> {
	try {
		return await event.request.formData();
	} catch {
		error(400, 'Bad request');
	}
}

function targetRequest(form: FormData): ScenarioTargetRequest {
	return {
		symbol: formValue(form, 'symbol').toUpperCase(),
		scenario: formValue(form, 'scenario') as ScenarioTargetRequest['scenario'],
		targetPrice: parseFloatGo(formValue(form, 'targetPrice')),
		highPrice: parseFloatGo(formValue(form, 'highPrice')),
		lowPrice: parseFloatGo(formValue(form, 'lowPrice')),
		rationale: formValue(form, 'rationale')
	};
}

export const actions: Actions = {
	// POST /portfolio/targets
	create: async (event) => {
		await gate(event, proRequired);
		const form = await readForm(event);
		try {
			await apiJSON(event, 'POST', '/v1/targets', targetRequest(form));
		} catch {
			// Go re-renders an empty add form carrying only the error.
			return { targetForm: emptyTargetForm({ error: 'Failed to create target' }) };
		}
		redirect(303, '/portfolio/targets');
	},

	// PUT /portfolio/targets/{id}
	update: async (event) => {
		await gate(event, proRequired);
		const form = await readForm(event);
		const id = parseUUID(formValue(form, 'id'));
		if (!id) error(400, 'Invalid ID');
		const req = targetRequest(form);
		try {
			await apiJSON(event, 'PUT', '/v1/targets/' + id, req);
		} catch {
			return {
				targetForm: emptyTargetForm({
					isEdit: true,
					id,
					symbol: req.symbol,
					scenario: req.scenario,
					targetPrice: formValue(form, 'targetPrice'),
					highPrice: formValue(form, 'highPrice'),
					lowPrice: formValue(form, 'lowPrice'),
					rationale: req.rationale ?? '',
					error: 'Failed to update target'
				})
			};
		}
		redirect(303, '/portfolio/targets');
	},

	// DELETE /portfolio/targets/{id}/remove
	remove: async (event) => {
		await gate(event, proRequired);
		const form = await readForm(event);
		const id = parseUUID(formValue(form, 'id'));
		if (!id) error(400, 'Invalid ID');
		try {
			await apiJSON(event, 'DELETE', '/v1/targets/' + id);
		} catch {
			return fail(502, { removeError: 'Failed to remove target' });
		}
		return { removed: id };
	}
};
