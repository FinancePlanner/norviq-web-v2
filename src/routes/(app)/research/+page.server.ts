import type { Actions, PageServerLoad } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import {
	loadResearchViewModel,
	loadSavedMemos,
	submitResearch
} from '#lib/features/planning-tools/research/research.server.js';

// GET /research (handlers.Research), behind RequireFeature(AdvancedResearch).
export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.AdvancedResearch, 'Advanced research');
	const [vm, savedMemos] = await Promise.all([
		loadResearchViewModel(event, event.url.searchParams.get('symbol') ?? ''),
		loadSavedMemos(event)
	]);
	vm.savedMemos = savedMemos;
	if ((event.url.searchParams.get('saved') ?? '').trim() === '1')
		vm.successMessage = 'Research note saved.';
	return { vm };
};

// POST /research (handlers.ResearchSubmit). A failure re-renders the feedback
// slot; success redirects to /research?saved=1.
export const actions: Actions = {
	default: async (event) => {
		await requireFeature(event, Feature.AdvancedResearch, 'Advanced research');
		return submitResearch(event);
	}
};
