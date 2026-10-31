import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { safeRedirect } from '#lib/helpers.js';
import { validUUID } from '#lib/features/portfolio/automation/common.server.js';
import {
	callExpect,
	loadScreensVM,
	ScreenFormError,
	screenRequestFromForm
} from '#lib/features/portfolio/automation/screens.server.js';

// GET /portfolio/screens (SmartScreens) and its POST routes as named actions:
//   POST /portfolio/screens               → ?/create
//   POST /portfolio/screens/{id}          → ?id={id}&/update
//   POST /portfolio/screens/{id}/evaluate → ?id={id}&/evaluate
//   POST /portfolio/screens/{id}/delete   → ?id={id}&/delete
// Failures answer like Go's http.Error (400 bad form, 404 bad id, 422 backend).

const gate = (event: RequestEvent) =>
	requireFeature(event, Feature.SmartScreening, 'Smart screening');

export const load: PageServerLoad = async (event) => {
	await gate(event);
	return { vm: await loadScreensVM(event) };
};

function screenID(event: RequestEvent): { raw: string; id: string } {
	const raw = event.url.searchParams.get('id') ?? '';
	const id = validUUID(raw);
	if (!id) error(404, 'Not Found');
	return { raw, id };
}

async function screenBody(event: RequestEvent) {
	const form = await event.request.formData();
	try {
		return screenRequestFromForm(form);
	} catch (err) {
		if (err instanceof ScreenFormError) error(400, err.message);
		throw err;
	}
}

export const actions: Actions = {
	create: async (event) => {
		await gate(event);
		const body = await screenBody(event);
		if (!(await callExpect(event, 'POST', '/v1/watchlist/screens', 200, body)))
			error(422, 'Could not create screen');
		safeRedirect(303, '/portfolio/screens');
	},
	update: async (event) => {
		await gate(event);
		const { id } = screenID(event);
		const body = await screenBody(event);
		if (!(await callExpect(event, 'PUT', `/v1/watchlist/screens/${id}`, 200, body)))
			error(422, 'Could not update screen');
		safeRedirect(303, '/portfolio/screens');
	},
	evaluate: async (event) => {
		await gate(event);
		const { raw, id } = screenID(event);
		if (!(await callExpect(event, 'POST', `/v1/watchlist/screens/${id}/evaluate`, 200)))
			error(422, 'Could not evaluate screen');
		safeRedirect(303, '/portfolio/screens?evaluated=' + raw);
	},
	delete: async (event) => {
		await gate(event);
		const { id } = screenID(event);
		if (!(await callExpect(event, 'DELETE', `/v1/watchlist/screens/${id}`, 204)))
			error(422, 'Could not delete screen');
		safeRedirect(303, '/portfolio/screens');
	}
};
