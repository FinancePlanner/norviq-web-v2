// Port of norviq-web internal/server/assets/sentry.js (which used
// @sentry/browser; @sentry/sveltekit wraps the same SDK and adds SvelteKit
// routing spans). Loaded lazily by index.ts, only when a DSN is configured.
import * as Sentry from '@sentry/sveltekit';
import type { RuntimeSentryConfig } from './types.js';

let initialised = false;

export function initSentry(config: RuntimeSentryConfig | undefined): void {
	if (!config?.dsn || initialised) return;
	initialised = true;
	Sentry.init({
		dsn: config.dsn,
		environment: config.environment,
		tracesSampleRate: config.tracesSampleRate ?? 0.2,
		// No IP address, cookies or request bodies on events. Go set
		// sendDefaultPii: false (Sentry 9); Sentry 11 replaced it with
		// dataCollection, whose defaults collect, so each part is switched off.
		dataCollection: { userInfo: false, cookies: false, httpBodies: [] },
		integrations: [Sentry.browserTracingIntegration()],
		initialScope: { tags: { platform: 'javascript' } }
	});
	// Go added these on top of the SDK's own global handlers; its Dedupe
	// integration drops the repeat, so they are kept for parity.
	window.addEventListener('error', (event) => {
		Sentry.captureException(event.error ?? new Error(event.message));
	});
	window.addEventListener('unhandledrejection', (event) => {
		Sentry.captureException(event.reason);
	});
}

/** Reports an error SvelteKit caught on the client, once Sentry is initialised. */
export function captureClientError(error: unknown): void {
	if (initialised) Sentry.captureException(error);
}
