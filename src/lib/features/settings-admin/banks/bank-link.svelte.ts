// Port of norviq-web internal/server/assets/bank-link.js (Alpine `bankLink`).
//
// Plaid Link connect flow for the bank-sync page: loads the Plaid Link web SDK
// on demand, fetches a link token from the BFF, opens Plaid Link, and posts the
// resulting public token back to be exchanged server-side. Bank credentials are
// entered inside Plaid's own UI and never touch Norviq. No CSRF header: the
// same-origin fetches pass SvelteKit's origin check.

const PLAID_SDK_URL = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

interface PlaidMetadata {
	institution?: { institution_id?: string; name?: string } | null;
}

interface PlaidSDK {
	create(opts: {
		token: string;
		onSuccess: (publicToken: string, metadata: PlaidMetadata) => void | Promise<void>;
		onExit: () => void;
	}): { open(): void };
}

declare global {
	interface Window {
		Plaid?: PlaidSDK;
	}
}

function loadPlaidSDK(): Promise<PlaidSDK> {
	return new Promise((resolve, reject) => {
		if (window.Plaid) {
			resolve(window.Plaid);
			return;
		}
		const existing = document.querySelector<HTMLScriptElement>(`script[src="${PLAID_SDK_URL}"]`);
		if (existing) {
			existing.addEventListener('load', () => resolve(window.Plaid!));
			existing.addEventListener('error', reject);
			return;
		}
		const script = document.createElement('script');
		script.src = PLAID_SDK_URL;
		script.onload = () => resolve(window.Plaid!);
		script.onerror = () => reject(new Error('Failed to load Plaid'));
		document.head.appendChild(script);
	});
}

export class BankLink {
	loading = $state(false);
	error = $state('');

	async connect() {
		this.error = '';
		this.loading = true;
		try {
			const Plaid = await loadPlaidSDK();
			const sessionResp = await fetch('/settings/banks/link-session', { method: 'POST' });
			if (!sessionResp.ok) throw new Error(`link session ${sessionResp.status}`);
			const { linkToken } = (await sessionResp.json()) as { linkToken?: string | null };
			if (!linkToken) throw new Error('no link token');

			const handler = Plaid.create({
				token: linkToken,
				onSuccess: async (publicToken, metadata) => {
					await this.exchange(publicToken, metadata);
				},
				onExit: () => {
					this.loading = false;
				}
			});
			handler.open();
		} catch {
			this.error = 'Could not start bank connection. Try again.';
			this.loading = false;
		}
	}

	async exchange(publicToken: string, metadata: PlaidMetadata) {
		try {
			const institution = metadata?.institution ?? {};
			const resp = await fetch('/settings/banks/exchange', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					publicToken,
					institutionId: institution.institution_id || '',
					institutionName: institution.name || ''
				})
			});
			if (!resp.ok) throw new Error(`exchange ${resp.status}`);
			window.location.assign('/settings/banks');
		} catch {
			this.error = 'Connected, but saving failed. Refresh and try syncing.';
			this.loading = false;
		}
	}
}
