// The rules behind the Quick Q card (components/QuickAssistant.svelte): where
// its button shows, which conversation it uses, and what it displays.

import { PLAN_NOT_CONFIRMED, TOO_MANY_REQUESTS } from './stream.js';
import type { AIConsentRefusal, MessageRow } from './types.js';

const STORAGE_KEY = 'norviq.quickQ.conversation';
const UNAVAILABLE = 'Assistant unavailable';

/**
 * Full Q needs no shortcut to itself, the consent page must not be covered, and
 * group chat keeps its composer where the button would sit.
 */
export function quickQAllowedOn(pathname: string): boolean {
	return !/^\/(assistant|ai-consent)(\/|$)|^\/groups\/./.test(pathname);
}

/** The latest question and everything after it. The card shows one exchange at a time. */
export function latestExchange(messages: MessageRow[]): MessageRow[] {
	const start = messages.findLastIndex((message) => message.role === 'user');
	return start < 0 ? [] : messages.slice(start);
}

/**
 * The stored id needs no user in its key: the backend only finds a user's own
 * conversations, so after an account switch the next turn starts a new one.
 */
export function storedConversation(storage: Pick<Storage, 'getItem'>): string | null {
	try {
		return storage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

export function storeConversation(storage: Pick<Storage, 'setItem'>, id: string) {
	try {
		storage.setItem(STORAGE_KEY, id);
	} catch {
		/* Private mode: the next page load starts another conversation. */
	}
}

export function forgetConversation(storage: Pick<Storage, 'removeItem'>) {
	try {
		storage.removeItem(STORAGE_KEY);
	} catch {
		/* Nothing was stored. */
	}
}

/**
 * Creates the Quick Q conversation. Resolves with null when the page is leaving
 * for the consent page, and throws the line to show on any other refusal.
 */
export async function createQuickConversation(
	request: typeof fetch,
	assign: (url: string) => void
): Promise<string | null> {
	const response = await request('/assistant/quick', {
		method: 'POST',
		headers: { Accept: 'application/json' }
	});
	if (response.status === 403) {
		const refusal = (await response.json().catch(() => null)) as AIConsentRefusal | null;
		if (refusal?.reason === 'AI_CONSENT_REQUIRED' && refusal.consentUrl) {
			assign(refusal.consentUrl);
			return null;
		}
	}
	if (response.status === 402) throw new Error(PLAN_NOT_CONFIRMED);
	if (response.status === 429) throw new Error(TOO_MANY_REQUESTS);
	if (!response.ok) throw new Error(UNAVAILABLE);
	const created = (await response.json().catch(() => null)) as { id?: unknown } | null;
	if (typeof created?.id !== 'string' || created.id === '') throw new Error(UNAVAILABLE);
	return created.id;
}
