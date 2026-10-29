import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPollURL, type VerifyStateVM } from '#lib/features/settings-admin/api-access/connect.js';
import { listPersonalAccessTokens } from '#lib/features/settings-admin/api-access/tokens.server.js';
import { formatRelativeTime } from '#lib/features/settings-admin/api-access/time.js';

// Port of norviq-web APIAccessVerifyPartial (settings_apiaccess_verify.go).
// Go answered the htmx poll with the ConnectVerify fragment; this answers the
// same state as JSON for the ConnectVerify component's query. A token's
// lastUsedAt only moves on a real tool call, so it proves the whole path works.

const VERIFY_POLL_WINDOW_MS = 2 * 60 * 1000;

export const GET: RequestHandler = async (event) => {
	const tokenID = event.params.id.trim();
	const now = Date.now();
	let startedAt = now;
	const raw = (event.url.searchParams.get('started') ?? '').trim();
	if (/^[+-]?\d+$/.test(raw)) startedAt = Number.parseInt(raw, 10) * 1000;

	const vm: VerifyStateVM = {
		tokenID,
		state: 'timeout',
		lastUsed: '',
		keepPolling: false,
		pollURL: verifyPollURL(tokenID, startedAt)
	};
	if (tokenID === '') return json(vm);

	let tokens;
	try {
		tokens = await listPersonalAccessTokens(event);
	} catch (err) {
		// A transient backend blip should not end the wizard.
		console.warn('list PAT for connection verify failed', err);
		return json({ ...vm, state: 'waiting', keepPolling: true });
	}
	const lastUsedAt = tokens.find((t) => t.id === tokenID)?.lastUsedAt;
	if (lastUsedAt) {
		return json({ ...vm, state: 'connected', lastUsed: formatRelativeTime(new Date(lastUsedAt), new Date(now)) });
	}
	if (now - startedAt >= VERIFY_POLL_WINDOW_MS) return json(vm);
	return json({ ...vm, state: 'waiting', keepPolling: true });
};
