// internal/handlers/oauth_consent.go + internal/api/oauth_consent.go (MCP
// client authorization). Hand-written in Go; not in the OpenAPI spec.
import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';

export interface OAuthFlowDetail {
	clientName: string;
	scopes: string[];
	scopeDescriptions: string[];
}

/**
 * isSafeRedirectURL: an absolute http(s) URL with a host, or a registered
 * custom scheme (myapp://callback). Never a relative, javascript: or data: URL.
 */
export function isSafeRedirectURL(raw: string): boolean {
	// url.ParseRequestURI: an opaque "scheme:rest" (no slash) is rejected.
	if (!/^[a-z][a-z0-9+.-]*:\//i.test(raw)) return false;
	let u: URL;
	try {
		u = new URL(raw);
	} catch {
		return false;
	}
	const scheme = u.protocol.replace(/:$/, '').toLowerCase();
	if (scheme === 'http' || scheme === 'https') return u.host !== '';
	if (scheme === 'javascript' || scheme === 'data' || scheme === 'vbscript') return false;
	return true;
}

/** decideConsent: approve or deny, then send the browser to the client's redirect URI. */
export async function decideConsent(event: RequestEvent, approve: boolean): Promise<never> {
	const form = await event.request.formData().catch(() => null);
	if (!form) error(400, 'Invalid form submission.');
	const flowId = String(form.get('flow_id') ?? '').trim();
	if (!flowId) error(400, 'Missing flow_id.');
	let redirectURL = '';
	try {
		const res = await apiJSON<{ redirect_url?: string }>(
			event,
			'POST',
			`/v1/oauth/flows/${encodeURIComponent(flowId)}/${approve ? 'approve' : 'deny'}`,
			{}
		);
		redirectURL = res?.redirect_url ?? '';
	} catch {
		redirectURL = '';
	}
	if (!redirectURL) error(502, 'Could not complete the authorization request.');
	if (!isSafeRedirectURL(redirectURL)) error(502, 'Invalid redirect URI returned by server.');
	redirect(303, redirectURL, { external: true });
}
