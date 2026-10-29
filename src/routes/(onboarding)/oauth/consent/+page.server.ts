import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { apiJSON } from '#lib/server/api.js';
import type { OAuthFlowDetail } from '#lib/features/auth-onboarding/oauth-consent.server.js';

// GET /oauth/consent (oauth_consent.go OAuthConsent). RequireAuth sends a
// signed-out visitor to /login?next=… and back here.
export const load: PageServerLoad = async (event) => {
	const flowId = (event.url.searchParams.get('flow_id') ?? '').trim();
	if (!flowId) error(400, 'Missing flow_id');
	const vm = { flowId, clientName: '', scopeDescriptions: [] as string[], errorMessage: '' };
	try {
		const detail = await apiJSON<OAuthFlowDetail>(event, 'GET', `/v1/oauth/flows/${encodeURIComponent(flowId)}`);
		vm.clientName = detail.clientName ?? '';
		vm.scopeDescriptions = detail.scopeDescriptions ?? [];
	} catch {
		vm.errorMessage = 'This authorization request is invalid or has expired.';
	}
	return { vm };
};
