import type { Actions, PageServerLoad, RequestEvent } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import { errorMessage, errorStatus } from '#lib/features/settings-admin/api-errors.js';

type Prefs = components['schemas']['EarningsNotificationPreferencesResponse'];

interface NotificationsVM {
	earningsEnabled: boolean;
	leadDays: string;
	scopeLabel: string;
	errorMessage: string;
	successMessage: string;
}

function notificationScopeLabel(scope: string): string {
	switch (scope.trim().toLowerCase()) {
		case 'portfolio_and_watchlist':
			return 'Portfolio and watchlist';
		case 'portfolio':
			return 'Portfolio';
		case 'watchlist':
			return 'Watchlist';
		default:
			return scope.trim() === '' ? 'Portfolio and watchlist' : scope.replaceAll('_', ' ');
	}
}

function formatLeadDays(days: number[] | null | undefined): string {
	if (!days || days.length === 0) return 'Default schedule';
	return days.map((d) => (d === 0 ? 'same day' : d === 1 ? '1 day before' : `${d} days before`)).join(', ');
}

const blank = (): NotificationsVM => ({ earningsEnabled: false, leadDays: '', scopeLabel: '', errorMessage: '', successMessage: '' });

// Go LoadNotificationsVM.
async function loadVM(event: RequestEvent): Promise<NotificationsVM> {
	const vm = blank();
	try {
		const prefs = await apiJSON<Prefs>(event, 'GET', '/v1/notifications/earnings/preferences');
		vm.earningsEnabled = prefs.enabled;
		vm.scopeLabel = notificationScopeLabel(prefs.scope ?? '');
		vm.leadDays = formatLeadDays(prefs.leadDays);
	} catch (err) {
		console.warn('earnings notification preferences fetch failed', errorStatus(err), err);
		vm.errorMessage = 'Could not load notification settings.';
	}
	return vm;
}

export const load: PageServerLoad = async (event) => ({ vm: await loadVM(event) });

export const actions: Actions = {
	// Go SettingsNotificationsSubmit (POST /settings/notifications/earnings):
	// re-renders the form from the backend's answer.
	earnings: async (event) => {
		const form = await event.request.formData();
		const enabled = String(form.get('earnings_enabled') ?? '').trim() === '1';
		try {
			const prefs = await apiJSON<Prefs>(event, 'PUT', '/v1/notifications/earnings/preferences', { enabled });
			const vm: NotificationsVM = {
				earningsEnabled: prefs.enabled,
				leadDays: formatLeadDays(prefs.leadDays),
				scopeLabel: notificationScopeLabel(prefs.scope ?? ''),
				errorMessage: '',
				successMessage: 'Notification settings updated.'
			};
			return { vm };
		} catch (err) {
			const vm = await loadVM(event);
			vm.errorMessage = errorMessage(err, 'Could not update notification settings.');
			return { vm };
		}
	}
};
