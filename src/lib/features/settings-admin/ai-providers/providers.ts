import type { components } from '#lib/api/schema.js';
import { formatRelativeTime } from '../api-access/time.js';

// Port of norviq-web internal/handlers/settings_ai_providers.go (catalog, row
// building) and internal/pages/settings/ai_providers_viewmodel.go.

export type UserAIProviderCredential = components['schemas']['UserAIProviderCredential'];
export type UserAIProviderKind = components['schemas']['UserAIProviderKind'];

export interface AIProviderRow {
	/** Empty when nothing is stored for this provider yet. */
	id: string;
	provider: string;
	label: string;
	title: string;
	/** Display-only, built from the backend's hint, e.g. "sk-ant-••••1a2b". Never the key. */
	masked: string;
	requiresEndpoint: boolean;
	baseURL: string;
	defaultModel: string;
	connected: boolean;
	status: string;
	statusText: string;
	/** ok | warn | bad | idle */
	statusTone: string;
	lastVerified: string;
	lastUsed: string;
}

export interface AIConsentVM {
	/** false when the lookup failed: the card says so instead of guessing. */
	known: boolean;
	granted: boolean;
	since: string;
	message: string;
}

const aiProviderCatalog = [
	{ provider: 'anthropic', title: 'Anthropic', label: 'Claude models, billed to your Anthropic account.', requiresEndpoint: false },
	{ provider: 'openai', title: 'OpenAI', label: 'GPT models, billed to your OpenAI account.', requiresEndpoint: false },
	{
		provider: 'compatible',
		title: 'OpenAI-compatible',
		label: 'Any self-hosted or third-party endpoint that speaks the OpenAI API.',
		requiresEndpoint: true
	}
];

function maskAIKey(provider: string, hint: string): string {
	const prefix = provider === 'anthropic' ? 'sk-ant-' : 'sk-';
	return hint === '' ? prefix + '••••' : prefix + '••••' + hint;
}

function aiStatusTone(status: string): string {
	switch (status) {
		case 'active':
			return 'ok';
		case 'invalid':
			return 'bad';
		case 'unverified':
			return 'warn';
		default:
			return 'idle';
	}
}

function aiStatusText(status: string, errorCode: string): string {
	switch (status) {
		case 'active':
			return 'Connected and verified.';
		case 'invalid':
			if (errorCode === 'invalid_key') {
				return 'The provider rejected this key. Replace it to keep using your own account.';
			}
			return 'This key was rejected. Replace it to keep using your own account.';
		case 'unverified':
			return 'Stored but not yet tested.';
		case 'disabled':
			return "Disabled. The assistant is using Norviq's key.";
		default:
			return "Not connected. The assistant uses Norviq's key.";
	}
}

/** buildAIProviderRows merges the catalog with whatever the backend has stored. */
export function buildAIProviderRows(stored: UserAIProviderCredential[], now: Date): AIProviderRow[] {
	const byProvider = new Map(stored.map((c) => [String(c.provider), c]));
	return aiProviderCatalog.map((entry) => {
		const row: AIProviderRow = {
			id: '',
			provider: entry.provider,
			title: entry.title,
			label: entry.label,
			masked: '',
			requiresEndpoint: entry.requiresEndpoint,
			baseURL: '',
			defaultModel: '',
			connected: false,
			status: '',
			statusTone: aiStatusTone(''),
			statusText: aiStatusText('', ''),
			lastVerified: '',
			lastUsed: ''
		};
		const cred = byProvider.get(entry.provider);
		if (cred) {
			const status = String(cred.status);
			row.id = cred.id;
			row.connected = true;
			row.masked = maskAIKey(entry.provider, cred.keyHint);
			row.status = status;
			row.statusTone = aiStatusTone(status);
			row.statusText = aiStatusText(status, cred.lastErrorCode ?? '');
			row.baseURL = cred.baseURL ?? '';
			row.defaultModel = cred.defaultModel ?? '';
			if (cred.lastVerifiedAt) row.lastVerified = formatRelativeTime(new Date(cred.lastVerifiedAt), now);
			if (cred.lastUsedAt) row.lastUsed = formatRelativeTime(new Date(cred.lastUsedAt), now);
		}
		return row;
	});
}

/** Go truncateMessage (byte length there; code units here — only ever applied to ASCII-ish API reasons). */
export function truncateMessage(s: string, max: number): string {
	return s.length <= max ? s : s.slice(0, max) + '…';
}

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/** aiCredentialID: uuid.Parse of the path id. */
export function parseCredentialID(raw: string): string | null {
	const v = raw.trim();
	return v !== '' && UUID_RE.test(v) ? v : null;
}
