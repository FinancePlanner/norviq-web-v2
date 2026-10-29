// Port of norviq-web internal/handlers/digest_unsubscribe.go and
// api/digest.go: the weekly digest email's unsubscribe link. The token in the
// link is the credential, so the backend call carries no bearer.
import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';

/** DigestPreference.makeUnsubscribeToken: 32 bytes, base64url, no padding. */
export const digestUnsubscribeTokenPattern = /^[A-Za-z0-9_-]{16,128}$/;

export const DIGEST_UNSUBSCRIBE_CACHE_CONTROL = 'private, no-store';

export async function unsubscribeDigest(event: RequestEvent, token: string): Promise<void> {
	await apiJSON<{ unsubscribed: boolean }>(event, 'POST', '/v1/digest/unsubscribe', undefined, { auth: 'none', query: { token } });
}
