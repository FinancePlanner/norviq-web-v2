import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { afterImportPath } from '#lib/features/auth-onboarding/onboarding/onboarding.server.js';
import {
	MAX_MANUAL_IMPORT_ROWS,
	bulkCreateStocks,
	defaultManualPageVM,
	manualPageVMFromQuery,
	parseBulkManualImport
} from '#lib/features/auth-onboarding/onboarding/import.server.js';

// GET /onboarding/import/manual (onboarding.go ImportManual). Reachable after
// onboarding from Settings → Integrations; no funnel bounce.
export const load: PageServerLoad = async ({ url }) => {
	const vm = manualPageVMFromQuery(url);
	vm.added = url.searchParams.get('added') === '1';
	return { step: 2, vm };
};

export const actions: Actions = {
	// POST /onboarding/import/manual (ImportManualSubmit): re-renders the page
	// with the entered rows (was an htmx swap of .onboarding-page).
	default: async (event) => {
		const form = await event.request.formData().catch(() => null);
		if (!form) return { vm: { ...defaultManualPageVM(), error: 'Invalid form submission.' } };

		const { stocks, vm, error } = parseBulkManualImport(form);
		if (error) return { vm: { ...vm, error } };

		if (form.get('action') === 'add_row') {
			vm.rows.push({ symbol: '', shares: '', buyPrice: '' });
			if (vm.rows.length > MAX_MANUAL_IMPORT_ROWS)
				vm.rows = vm.rows.slice(0, MAX_MANUAL_IMPORT_ROWS);
			return { vm };
		}

		const failure = await bulkCreateStocks(event, stocks);
		if (failure) return { vm: { ...vm, error: failure } };
		redirect(303, afterImportPath(event, 'manual'));
	}
};
