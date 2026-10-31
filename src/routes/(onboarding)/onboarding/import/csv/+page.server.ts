import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { afterImportPath } from '#lib/features/auth-onboarding/onboarding/onboarding.server.js';
import {
	loadCSVProviders,
	processCSVUpload
} from '#lib/features/auth-onboarding/onboarding/import.server.js';

// GET /onboarding/import/csv (onboarding.go ImportCSV). Reachable after
// onboarding too (Settings → Integrations), so no funnel guard.
export const load: PageServerLoad = async (event) => {
	const providers = await loadCSVProviders(event);
	let provider = (event.url.searchParams.get('provider') ?? '').trim();
	if (!provider && providers.length > 0) provider = providers[0];
	return { step: 2, providers, provider };
};

export const actions: Actions = {
	// POST /onboarding/import/csv/preview → the CSVPreviewPanel under the form.
	preview: async (event) => ({ preview: await processCSVUpload(event, false) }),
	// POST /onboarding/import/csv/commit (ImportCSVCommit). Re-renders the panel
	// when the upload failed, imported nothing, or reported row errors, so an
	// empty import never looks like success.
	commit: async (event) => {
		const vm = await processCSVUpload(event, true);
		if (vm.error || (vm.inserted === 0 && vm.updated === 0) || vm.errors.length > 0) {
			if (!vm.error && vm.inserted === 0 && vm.updated === 0 && vm.errors.length === 0) {
				vm.error = 'No rows were imported. Check the CSV and try again.';
			}
			return { preview: vm };
		}
		redirect(303, afterImportPath(event, 'csv'));
	}
};
