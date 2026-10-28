// Server half of the analytics port: norviq-web internal/server/runtime_config.go
// and internal/session/posthog.go.
//
// Same session keys as Go: posthogCaptureEvent holds the event name and
// posthogCaptureProps its properties as a JSON string.
import type { RequestEvent } from '@sveltejs/kit';
import { config } from '#lib/server/env.js';
import type { PostHogCaptureOnce, RuntimeConfig } from './types.js';

export const KEY_POSTHOG_CAPTURE_EVENT = 'posthogCaptureEvent';
export const KEY_POSTHOG_CAPTURE_PROPS = 'posthogCaptureProps';

// Go's SENTRY_TRACES_SAMPLE_RATE default. config() (src/lib/server/env.ts)
// does not parse that variable yet, so the default is what v2 sends.
const DEFAULT_TRACES_SAMPLE_RATE = 0.2;

type Locals = Pick<App.Locals, 'session'>;

/**
 * session.SetPostHogCaptureOnce: the next page the browser renders captures
 * `event` once (see the root layout). Call it from a form action or endpoint
 * before redirecting, e.g. after login: ('user_logged_in', { method: 'email' }).
 * Go also renewed the session token here; the sealed cookie is re-issued anyway.
 */
export async function setPostHogCaptureOnce(locals: Locals, event: string, properties?: Record<string, unknown> | null): Promise<void> {
	const session = locals.session;
	session.data.flags[KEY_POSTHOG_CAPTURE_EVENT] = event;
	if (!properties || Object.keys(properties).length === 0) delete session.data.flags[KEY_POSTHOG_CAPTURE_PROPS];
	else session.data.flags[KEY_POSTHOG_CAPTURE_PROPS] = JSON.stringify(properties);
	await session.save();
}

/** session.TakePostHogCaptureOnce: returns the pending capture and clears it, or null. */
export async function takePostHogCaptureOnce(locals: Locals): Promise<PostHogCaptureOnce | null> {
	const session = locals.session;
	const raw = session.get<unknown>(KEY_POSTHOG_CAPTURE_EVENT);
	// Also accept { event, properties } stored under the one key.
	const packed = raw && typeof raw === 'object' ? (raw as Partial<PostHogCaptureOnce>) : null;
	const event = packed ? String(packed.event ?? '') : typeof raw === 'string' ? raw : '';
	if (!event) return null;
	const propsJSON = session.get<unknown>(KEY_POSTHOG_CAPTURE_PROPS);
	await session.remove(KEY_POSTHOG_CAPTURE_EVENT, KEY_POSTHOG_CAPTURE_PROPS);

	const capture: PostHogCaptureOnce = { event };
	if (packed?.properties) capture.properties = packed.properties;
	else if (typeof propsJSON === 'string' && propsJSON !== '') {
		try {
			capture.properties = JSON.parse(propsJSON);
		} catch {
			// Go ignored an unmarshal error too.
		}
	}
	return capture;
}

/**
 * The payload Go served at /runtime-config.js. As in Go, the capture-once flag
 * is only taken (and cleared) when PostHog is configured.
 */
export async function runtimeConfig(event: Pick<RequestEvent, 'locals'>): Promise<RuntimeConfig> {
	const cfg = config();
	const payload: RuntimeConfig = {};
	if (cfg.sentryDSN) {
		payload.sentry = { dsn: cfg.sentryDSN, environment: cfg.sentryEnvironment, tracesSampleRate: DEFAULT_TRACES_SAMPLE_RATE };
	}
	if (cfg.postHogProjectToken) {
		const session = event.locals.session;
		payload.posthog = { token: cfg.postHogProjectToken, host: cfg.postHogHost };
		if (session.isAuthenticated && session.auth?.userId) payload.posthog.userId = session.auth.userId;
		const capture = await takePostHogCaptureOnce(event.locals);
		if (capture) payload.posthog.captureOnce = capture;
	}
	return payload;
}
