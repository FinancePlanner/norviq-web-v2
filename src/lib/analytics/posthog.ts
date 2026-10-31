// Port of norviq-web internal/server/assets/posthog.js. Loaded lazily by
// index.ts, only when PostHog is configured.
import posthog from 'posthog-js';
import type { PostHogCaptureOnce, RuntimePostHogConfig } from './types.js';

let enabled = false;

export function capturePageview(): void {
	if (!enabled) return;
	posthog.capture('$pageview', { $current_url: window.location.href });
}

// Pseudonymous on purpose: the user ID is the only identifier analytics gets.
function applyIdentify(config: RuntimePostHogConfig) {
	if (config.userId) posthog.identify(config.userId);
}

export function applyCaptureOnce(captureOnce: PostHogCaptureOnce | undefined | null): void {
	if (!enabled || !captureOnce?.event) return;
	posthog.capture(captureOnce.event, captureOnce.properties ?? {});
	if (captureOnce.event === 'user_logged_out') posthog.reset();
}

export const norviqAnalytics = {
	capture(event: string, properties?: Record<string, unknown>) {
		if (!enabled) return;
		posthog.capture(event, properties ?? {});
	},
	// Properties are dropped deliberately: callers must not attach PII.
	identify(userId: string) {
		if (!enabled) return;
		posthog.identify(userId);
	},
	reset() {
		if (!enabled) return;
		posthog.reset();
	}
};

type QueueEntry = [string, Record<string, unknown>?];
type Queue = QueueEntry[] | { push: (entry: QueueEntry) => void };

declare global {
	interface Window {
		norviqAnalytics?: typeof norviqAnalytics;
		__norviqAnalyticsQueue?: Queue;
	}
}

/** posthog.js initPostHog() + the module side effects (window.norviqAnalytics, queue flush). */
export function initPostHog(config: RuntimePostHogConfig | undefined): void {
	window.norviqAnalytics = norviqAnalytics;
	if (config?.token && config.host && !enabled) {
		// Cookieless: 'memory' keeps the distinct ID in the page only, so
		// nothing lands in cookies or localStorage and no consent banner is
		// needed. /privacy#cookies depends on both settings below.
		posthog.init(config.token, {
			api_host: config.host,
			defaults: '2026-01-30',
			person_profiles: 'identified_only',
			persistence: 'memory',
			disable_session_recording: true,
			// Only explicit events are sent; autocapture would record clicks and page text.
			autocapture: false
		});
		enabled = true;
		applyIdentify(config);
		applyCaptureOnce(config.captureOnce);
		capturePageview();
	}
	// Clicks queued by landing code before init (window.__norviqAnalyticsQueue).
	const queued = Array.isArray(window.__norviqAnalyticsQueue) ? window.__norviqAnalyticsQueue : [];
	const sink = {
		push: ([event, properties]: QueueEntry) => norviqAnalytics.capture(event, properties)
	};
	window.__norviqAnalyticsQueue = sink;
	for (const [event, properties] of queued) norviqAnalytics.capture(event, properties);
}
