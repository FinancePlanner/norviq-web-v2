import * as privateEnv from '$app/env/private';

// Mirrors norviq-web internal/config/config.go. Every value is read per request
// from the Worker's bindings, so a `wrangler secret put` takes effect without a
// rebuild.

function str(key: string, fallback = ''): string {
	return ((privateEnv as Record<string, string | undefined>)[key] ?? fallback).trim();
}

function bool(key: string, fallback = false): boolean {
	const raw = (privateEnv as Record<string, string | undefined>)[key]?.trim().toLowerCase();
	if (!raw) return fallback;
	return raw === '1' || raw === 'true' || raw === 'yes';
}

function taxPackCheckoutURLs(raw: string): Record<number, string> {
	const out: Record<number, string> = {};
	for (const entry of raw.split(',')) {
		const [key, link] = entry.split('=', 2);
		const year = Number.parseInt(key?.trim() ?? '', 10);
		if (Number.isFinite(year) && link?.trim()) out[year] = link.trim();
	}
	return out;
}

export const DEFAULT_IOS_APP_STORE_URL =
	'https://apps.apple.com/app/money-manager-norviq/id6765849578';
// Empty while Norviq has no Play listing (same as config.go).
export const DEFAULT_GOOGLE_PLAY_URL = '';

export function config() {
	return {
		backendURL: str('BACKEND_URL', 'http://localhost:8080').replace(/\/+$/, ''),
		publicBaseURL: str('PUBLIC_BASE_URL', 'http://localhost:5173').replace(/\/+$/, ''),
		mcpPublicURL: str('MCP_PUBLIC_URL').replace(/\/+$/, ''),
		sessionSecret: str('SESSION_SECRET', 'dev-session-secret-change-me'),
		sessionIdleMinutes: Number.parseInt(str('SESSION_IDLE_TIMEOUT_MINUTES', '120'), 10) || 120,
		cookieSecure: bool('COOKIE_SECURE', str('GO_ENV') === 'production'),
		production: str('GO_ENV') === 'production',
		iosAppStoreURL: str('IOS_APP_STORE_URL', DEFAULT_IOS_APP_STORE_URL),
		googlePlayURL: str('GOOGLE_PLAY_URL', DEFAULT_GOOGLE_PLAY_URL),
		iosStoreRedirectEnabled: bool('IOS_STORE_REDIRECT_ENABLED'),
		revenueCatWebAPIKey: str('REVENUECAT_WEB_API_KEY'),
		taxPackCheckoutURL: str('TAX_PACK_CHECKOUT_URL'),
		taxPackCheckoutURLs: taxPackCheckoutURLs(str('TAX_PACK_CHECKOUT_URLS')),
		sentryDSN: str('SENTRY_DSN'),
		sentryEnvironment: str(
			'SENTRY_ENVIRONMENT',
			str('GO_ENV') === 'production' ? 'production' : 'development'
		),
		postHogProjectToken: str('POSTHOG_PROJECT_TOKEN'),
		postHogHost: str('POSTHOG_HOST').replace(/\/+$/, ''),
		publicAPIToken: str('PUBLIC_API_TOKEN'),
		// Shared with norviq-backend-v2 (EDGE_CLIENT_IP_KEY). The backend trusts
		// X-Norviq-Client-IP only when this key matches; see api.ts.
		edgeClientIPKey: str('EDGE_CLIENT_IP_KEY'),
		previewBasicAuth: str('PREVIEW_BASIC_AUTH')
	};
}

export type Config = ReturnType<typeof config>;

export function publicPagesEnabled(cfg: Config): boolean {
	return cfg.publicAPIToken !== '';
}
