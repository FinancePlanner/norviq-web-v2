import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { safeRedirect } from '#lib/helpers.js';
import {
	formString,
	parseOptionalFloat,
	validUUID
} from '#lib/features/portfolio/automation/common.server.js';
import { callExpect } from '#lib/features/portfolio/automation/screens.server.js';
import {
	loadRulesVM,
	parseTargets,
	policyBase,
	TargetsError
} from '#lib/features/portfolio/automation/rules.server.js';
import type { RebalancingPolicyUpsertRequest } from '#lib/features/portfolio/automation/types.js';

// GET /portfolio/rebalancing-rules (RebalancingRules) and its POST routes as
// named actions on this page:
//   POST /portfolio/rebalancing/{id}                           → ?id={id}&/save
//   POST /portfolio/rebalancing/{id}/events/{eventID}/confirm  → ?id={id}&event={eventID}&/confirm
//   POST /portfolio/rebalancing/{id}/events/{eventID}/dismiss  → ?id={id}&event={eventID}&/dismiss
// Failures answer like Go's http.Error (400 bad form, 404 bad id, 422 backend).

const gate = (event: RequestEvent) =>
	requireFeature(event, Feature.RebalancingRules, 'Rebalancing rules');

export const load: PageServerLoad = async (event) => {
	await gate(event);
	return { vm: await loadRulesVM(event) };
};

const CADENCES = new Set(['disabled', 'monthly', 'quarterly', 'semiannual', 'annual']);

async function updateEvent(event: RequestEvent, confirm: boolean) {
	await gate(event);
	const portfolioID = validUUID(event.url.searchParams.get('id'));
	const eventID = validUUID(event.url.searchParams.get('event'));
	if (!portfolioID || !eventID) error(404, 'Not Found');
	const path = `${policyBase(portfolioID)}/events/${eventID}/${confirm ? 'confirm' : 'dismiss'}`;
	if (!(await callExpect(event, 'POST', path, 200))) error(422, 'Could not update rebalance event');
	safeRedirect(303, '/portfolio/rebalancing-rules?portfolio=' + portfolioID);
}

export const actions: Actions = {
	save: async (event) => {
		await gate(event);
		const raw = event.url.searchParams.get('id') ?? '';
		const id = validUUID(raw);
		if (!id) error(404, 'Not Found');
		const form = await event.request.formData();
		let targets;
		try {
			targets = parseTargets(formString(form, 'targets'));
		} catch (err) {
			if (err instanceof TargetsError) error(400, err.message);
			throw err;
		}
		const drift = parseOptionalFloat(form.get('drift'));
		if (drift.error) error(400, 'Invalid drift threshold');
		const cadence = formString(form, 'cadence');
		if (!CADENCES.has(cadence)) error(400, 'Invalid cadence');
		const baseCurrency = formString(form, 'base_currency').trim().toUpperCase();
		if (new TextEncoder().encode(baseCurrency).length !== 3)
			error(400, 'Base currency must be a 3-letter code');
		const body: RebalancingPolicyUpsertRequest = {
			baseCurrency,
			enabled: form.get('enabled') === 'on',
			cadence: cadence as RebalancingPolicyUpsertRequest['cadence'],
			targets
		};
		if (drift.value !== undefined) body.driftThreshold = drift.value / 100;
		if (!(await callExpect(event, 'PUT', policyBase(id), 200, body)))
			error(422, 'Could not save policy');
		safeRedirect(303, '/portfolio/rebalancing-rules?portfolio=' + raw);
	},
	confirm: (event) => updateEvent(event, true),
	dismiss: (event) => updateEvent(event, false)
};
