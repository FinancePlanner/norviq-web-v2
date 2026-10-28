// The browser-side analytics config. Port of norviq-web runtime_config.go's
// payload (window.__RUNTIME__), which v2 delivers as root layout data
// (`data.runtime`) instead of a /runtime-config.js script.

export interface RuntimeSentryConfig {
	dsn: string;
	environment: string;
	tracesSampleRate: number;
}

export interface PostHogCaptureOnce {
	event: string;
	properties?: Record<string, unknown>;
}

/** Deliberately no email or username: analytics is pseudonymous (user ID only), as /privacy#cookies states. */
export interface RuntimePostHogConfig {
	token: string;
	host: string;
	userId?: string;
	captureOnce?: PostHogCaptureOnce;
}

export interface RuntimeConfig {
	sentry?: RuntimeSentryConfig;
	posthog?: RuntimePostHogConfig;
}
