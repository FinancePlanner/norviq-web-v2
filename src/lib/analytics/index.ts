// Client analytics entry. The root layout calls initAnalytics(data.runtime)
// once on mount, trackPageview() after each client navigation (Go captured a
// pageview on htmx:after:settle) and captureOnce() when a later navigation
// delivers a new capture-once event.
//
// PostHog and Sentry are imported lazily, so a page without either configured
// downloads neither.
import type { PostHogCaptureOnce, RuntimeConfig } from './types.js';

export type { RuntimeConfig, PostHogCaptureOnce } from './types.js';

let posthogModule: Promise<typeof import('./posthog.js')> | null = null;
// initAnalytics reports a chunk that failed to load. The calls made after it are then no-ops,
// rather than one unhandled rejection each.
const ignore = () => {};

export function initAnalytics(runtime: RuntimeConfig | null | undefined): void {
	if (runtime?.sentry?.dsn) {
		sentryWanted = true;
		import('./sentry.js').then((m) => m.initSentry(runtime.sentry), console.error);
	}
	const posthog = runtime?.posthog;
	if (posthog?.token && posthog.host) {
		posthogModule = import('./posthog.js');
		posthogModule.then((m) => m.initPostHog(posthog), console.error);
		return;
	}
	// Go always defined window.norviqAnalytics; without PostHog its calls are
	// no-ops, and queued landing clicks are dropped the same way.
	window.norviqAnalytics = { capture() {}, identify() {}, reset() {} };
	window.__norviqAnalyticsQueue = { push() {} };
}

export function trackPageview(): void {
	posthogModule?.then((m) => m.capturePageview(), ignore);
}

export function captureOnce(once: PostHogCaptureOnce | null | undefined): void {
	if (!once?.event) return;
	posthogModule?.then((m) => m.applyCaptureOnce(once), ignore);
}

/** norviqAnalytics.capture for components: no-op until PostHog is initialised. */
export function capture(event: string, properties?: Record<string, unknown>): void {
	posthogModule?.then((m) => m.norviqAnalytics.capture(event, properties), ignore);
}

let sentryWanted = false;

/** Forwards an unexpected client error to Sentry when a DSN is configured (hooks.client.ts). */
export function reportClientError(thrown: unknown): void {
	if (!sentryWanted) return;
	import('./sentry.js').then((m) => m.captureClientError(thrown), console.error);
}
