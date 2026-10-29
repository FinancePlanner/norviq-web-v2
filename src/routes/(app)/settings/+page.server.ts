import type { PageServerLoad } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import { isPro } from '#lib/billing.js';
import { formatPlanLabel } from '#lib/features/settings-admin/subscription.js';

type GetUserProfileResponse = components['schemas']['GetUserProfileResponse'];

// Go Settings, section "": LoadSettingsIndexVM.
export const load: PageServerLoad = async (event) => {
	const vm = { username: '', email: '', isPro: false, planLabel: '', hasProfile: false, profileError: '' };
	try {
		const resp = await apiJSON<GetUserProfileResponse>(event, 'GET', '/v1/users');
		const profile = resp.userProfile;
		vm.hasProfile = true;
		vm.username = (profile.username ?? '').trim();
		vm.email = profile.email;
	} catch {
		vm.profileError = 'Could not load your profile.';
		return { vm };
	}
	const billing = await loadBillingContext(event);
	vm.isPro = isPro(billing);
	if (billing) vm.planLabel = formatPlanLabel(billing.plan);
	else vm.planLabel = vm.isPro ? 'Pro' : 'Free Plan';
	return { vm };
};
