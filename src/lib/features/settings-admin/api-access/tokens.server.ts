import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';

// Port of norviq-web internal/api/tokens.go. The backend OpenAPI spec does not
// describe /v1/tokens, so these are hand-written like the Go client.

export interface PersonalAccessToken {
	id: string;
	name: string;
	scopes: string[] | null;
	lastUsedAt?: string | null;
	expiresAt: string;
	createdAt: string;
}

export interface CreatePATResult extends PersonalAccessToken {
	token: string;
}

export async function listPersonalAccessTokens(event: RequestEvent): Promise<PersonalAccessToken[]> {
	const envelope = await apiJSON<{ items?: PersonalAccessToken[] | null }>(event, 'GET', '/v1/tokens');
	return envelope?.items ?? [];
}

export async function createPersonalAccessToken(
	event: RequestEvent,
	name: string,
	scopes: string[],
	expiresInDays: number
): Promise<CreatePATResult> {
	// Go: ExpiresInDays `json:",omitempty"` — 0 is left out.
	const body: { name: string; scopes: string[]; expiresInDays?: number } = { name, scopes };
	if (expiresInDays) body.expiresInDays = expiresInDays;
	return apiJSON<CreatePATResult>(event, 'POST', '/v1/tokens', body);
}

export async function revokePersonalAccessToken(event: RequestEvent, id: string): Promise<void> {
	await apiJSON(event, 'DELETE', '/v1/tokens/' + encodeURIComponent(id));
}
