import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import {
	apiErrorMessage,
	errorMessage,
	errorStatus,
	readableAPIReasons
} from '#lib/features/settings-admin/api-errors.js';

type GetUserProfileResponse = components['schemas']['GetUserProfileResponse'];
type LinkedAccounts = components['schemas']['OAuthLinkedAccountsResponse'];

interface ConnectedAccountVM {
	provider: string;
	label: string;
	connected: boolean;
	email: string;
	emailVerified: boolean;
}

interface ProfileVM {
	username: string;
	email: string;
	errorMessage: string;
	successMessage: string;
	connectedAccounts: ConnectedAccountVM[];
	connectedAccountsError: string;
}

function oauthProviderLabel(provider: string): string {
	switch (provider.trim().toLowerCase()) {
		case 'apple':
			return 'Apple';
		case 'google':
			return 'Google';
		case 'x':
			return 'X';
		default:
			return 'Sign-in account';
	}
}

const defaultConnectedAccounts = (): ConnectedAccountVM[] =>
	['apple', 'google', 'x'].map((p) => ({
		provider: p,
		label: oauthProviderLabel(p),
		connected: false,
		email: '',
		emailVerified: false
	}));

// Go LoadProfileVM (+ applyOAuthLinkFeedback, loadConnectedAccounts).
async function loadProfileVM(event: RequestEvent, withQueryFeedback: boolean): Promise<ProfileVM> {
	const vm: ProfileVM = {
		username: '',
		email: '',
		errorMessage: '',
		successMessage: '',
		connectedAccounts: [],
		connectedAccountsError: ''
	};
	if (withQueryFeedback) {
		// Go read these off r.URL on every LoadProfileVM; an action's URL has none.
		const connected = (event.url.searchParams.get('connected') ?? '').trim();
		if (connected) vm.successMessage = oauthProviderLabel(connected) + ' connected.';
		const connectedError = (event.url.searchParams.get('connected_error') ?? '').trim();
		if (connectedError) vm.errorMessage = connectedError;
	}
	try {
		const resp = await apiJSON<GetUserProfileResponse>(event, 'GET', '/v1/users');
		vm.username = (resp.userProfile.username ?? '').trim();
		vm.email = resp.userProfile.email;
	} catch {
		vm.errorMessage = 'Could not load your profile.';
		return vm;
	}
	vm.connectedAccounts = defaultConnectedAccounts();
	try {
		const resp = await apiJSON<LinkedAccounts>(event, 'GET', '/v1/auth/oauth/identities');
		const accounts = (resp.accounts ?? []).map((a) => ({
			provider: String(a.provider),
			label: oauthProviderLabel(String(a.provider)),
			connected: a.connected,
			email: a.email ?? '',
			emailVerified: a.emailVerified
		}));
		if (accounts.length > 0) vm.connectedAccounts = accounts;
	} catch {
		vm.connectedAccountsError = 'Could not load connected sign-in accounts.';
	}
	return vm;
}

export const load: PageServerLoad = async (event) => {
	const vm = await loadProfileVM(event, true);
	if ((event.url.searchParams.get('saved') ?? '').trim() === '1')
		vm.successMessage = 'Profile updated.';
	return { vm };
};

/** renderProfileFeedback: the #profile-feedback block shows only the error. */
const feedback = (errorMessage: string) => ({ feedback: { successMessage: '', errorMessage } });

// emailChangeErrorMessage
function emailChangeErrorMessage(status: number, body: unknown): string {
	if (status === 401) return readableAPIReasons.INVALID_CURRENT_PASSWORD;
	if (status === 409 && apiErrorMessage(body, '').toLowerCase().includes('already'))
		return 'That email is already in use.';
	return apiErrorMessage(body, 'Could not update email.');
}

export const actions: Actions = {
	// Go SettingsProfileSubmit (POST /settings/profile).
	save: async (event) => {
		let form: FormData;
		try {
			form = await event.request.formData();
		} catch {
			return feedback('Invalid form submission.');
		}
		const username = String(form.get('username') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const currentPassword = String(form.get('current_password') ?? '');
		const newPassword = String(form.get('new_password') ?? '');

		const vm = await loadProfileVM(event, false);
		if (vm.errorMessage !== '' && vm.username === '' && vm.email === '')
			return feedback(vm.errorMessage);

		let errMsg = '';
		if (username !== '' && username !== vm.username) {
			try {
				await apiJSON(event, 'PATCH', '/v1/users/username', { username });
			} catch (err) {
				errMsg = errorMessage(err, 'Could not update username.');
			}
		}

		// Email and password changes revoke every other session on the backend;
		// passing this session's refresh token keeps the web user signed in.
		const refreshToken = event.locals.session.auth?.refreshToken || undefined;

		if (errMsg === '' && email !== '' && email.toLowerCase() !== vm.email.toLowerCase()) {
			if (currentPassword.trim() === '') {
				errMsg = 'Enter your current password to change your email.';
			} else {
				try {
					await apiJSON(event, 'PATCH', '/v1/users/email', {
						email,
						currentPassword,
						refreshToken
					});
				} catch (err) {
					errMsg = emailChangeErrorMessage(
						errorStatus(err),
						isAPIError(err) ? err.body : undefined
					);
				}
			}
		}

		if (errMsg === '' && newPassword.trim() !== '') {
			if (currentPassword.trim() === '') {
				errMsg = 'Enter your current password to set a new one.';
			} else {
				try {
					await apiJSON(event, 'PATCH', '/v1/users/password', {
						currentPassword,
						newPassword,
						refreshToken
					});
				} catch (err) {
					errMsg =
						errorStatus(err) === 401
							? readableAPIReasons.INVALID_CURRENT_PASSWORD
							: errorMessage(err, 'Could not update password.');
				}
			}
		}

		if (errMsg !== '') return feedback(errMsg);
		redirect(303, '/settings/profile?saved=1');
	},

	// Go SettingsProfileDelete (POST /settings/profile/delete).
	delete: async (event) => {
		let form: FormData;
		try {
			form = await event.request.formData();
		} catch {
			return feedback('Invalid delete request.');
		}
		if (String(form.get('confirm') ?? '').trim() !== 'DELETE')
			return feedback('Type DELETE to confirm account removal.');
		try {
			await apiJSON(event, 'DELETE', '/v1/users');
		} catch {
			return feedback('Could not delete your account.');
		}
		// session.ClearAuth
		await event.locals.session.destroy();
		redirect(303, '/login');
	}
};
