import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadBillingContext } from '#lib/server/app-context.js';
import { isPro as billingIsPro } from '#lib/billing.js';
import { pilotsCall, requirePilots } from '#lib/features/settings-admin/pilots/gate.server.js';
import {
	pilotForForm,
	pilotWatchlistOptions
} from '#lib/features/settings-admin/pilots/data.server.js';
import {
	DEFAULT_PILOT_STARTING_CAPITAL,
	TARGET_NEW_WATCHLIST,
	TARGET_PORTFOLIO,
	newPilotFollowFormVM,
	parsePilotFollowForm,
	pilotFollowErrorMessage,
	uuidString
} from '#lib/features/settings-admin/pilots/vm.js';
import type {
	BillingUpgradeRequiredResponse,
	FollowFormVM,
	PilotFollowResponse
} from '#lib/features/settings-admin/pilots/types.js';

// handlers.PilotFollowForm: the follow form for one pilot.
export const load: PageServerLoad = async (event) => {
	await requirePilots(event);
	const detail = await pilotForForm(event);
	const { isPro } = await event.parent();
	const vm = newPilotFollowFormVM(detail, isPro);
	vm.target = isPro ? TARGET_PORTFOLIO : TARGET_NEW_WATCHLIST;
	vm.startingCapital = DEFAULT_PILOT_STARTING_CAPITAL;
	vm.idempotencyKey = crypto.randomUUID();
	vm.watchlists = await pilotWatchlistOptions(event);
	return { vm, activePath: '/markets' };
};

function formError(vm: FollowFormVM) {
	// renderPilotFollowFormError: the form again, with a sentence, as a 422.
	return fail(422, { vm });
}

export const actions: Actions = {
	// handlers.PilotFollowCreate: starts a follow and lands on its page. Every
	// refusal re-renders the form with a sentence, never a status code.
	default: async (event) => {
		await requirePilots(event);
		let form: FormData;
		try {
			form = await event.request.formData();
		} catch {
			error(400, 'Invalid form submission.');
		}
		const detail = await pilotForForm(event);
		const isPro = billingIsPro(await loadBillingContext(event));
		const { req, vm, msg } = parsePilotFollowForm(form, detail, isPro);
		if (msg) {
			vm.error = msg;
			vm.watchlists = await pilotWatchlistOptions(event);
			return formError(vm);
		}
		// The form's key makes a double submit replay the first response
		// instead of creating a second follow.
		const res = await pilotsCall<PilotFollowResponse>(event, 'POST', '/v1/pilot-follows', req, {
			'Idempotency-Key': vm.idempotencyKey
		});
		if (res.status === 0) {
			console.warn('create pilot follow', detail.pilot.slug, 'transport error');
			vm.error = 'Could not start following. Check your connection and try again.';
			vm.watchlists = await pilotWatchlistOptions(event);
			return formError(vm);
		}
		if (!res.ok || res.status !== 201 || !res.data) {
			const body = res.ok ? undefined : res.body;
			const upgrade =
				res.status === 403 && body && typeof body === 'object' && 'code' in body
					? (body as BillingUpgradeRequiredResponse)
					: null;
			const { message, showUpgrade } = pilotFollowErrorMessage(res.status, body, upgrade);
			vm.error = message;
			vm.showUpgrade = showUpgrade;
			vm.watchlists = await pilotWatchlistOptions(event);
			return formError(vm);
		}
		const notice =
			'Now following ' + res.data.pilot.displayName + '. Every trade here is simulated.';
		redirect(
			303,
			'/pilot-follows/' + uuidString(res.data.id) + '?' + new URLSearchParams({ notice }).toString()
		);
	}
};
