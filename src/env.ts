import { defineEnvVars } from '@sveltejs/kit/env';

// Every runtime setting the Worker reads. Same names as norviq-web's env
// (internal/config/config.go) so infra values carry over unchanged. All are
// optional strings here; src/lib/server/env.ts applies defaults and parsing.
const optional = (value: string | undefined) => value ?? '';

export const variables = defineEnvVars({
	BACKEND_URL: { schema: optional },
	PUBLIC_BASE_URL: { schema: optional },
	MCP_PUBLIC_URL: { schema: optional },
	SESSION_SECRET: { schema: optional },
	SESSION_IDLE_TIMEOUT_MINUTES: { schema: optional },
	COOKIE_SECURE: { schema: optional },
	GO_ENV: { schema: optional },
	IOS_APP_STORE_URL: { schema: optional },
	GOOGLE_PLAY_URL: { schema: optional },
	IOS_STORE_REDIRECT_ENABLED: { schema: optional },
	REVENUECAT_WEB_API_KEY: { schema: optional },
	TAX_PACK_CHECKOUT_URL: { schema: optional },
	TAX_PACK_CHECKOUT_URLS: { schema: optional },
	SENTRY_DSN: { schema: optional },
	SENTRY_ENVIRONMENT: { schema: optional },
	SENTRY_TRACES_SAMPLE_RATE: { schema: optional },
	POSTHOG_PROJECT_TOKEN: { schema: optional },
	POSTHOG_HOST: { schema: optional },
	PUBLIC_API_TOKEN: { schema: optional },
	EDGE_CLIENT_IP_KEY: { schema: optional },
	// Dev only: /__dev/login signs in as these staging test accounts.
	DEV_LOGIN_EMAIL: { schema: optional },
	DEV_LOGIN_EMAIL_ONBOARDING: { schema: optional },
	DEV_LOGIN_PASSWORD: { schema: optional },
});
