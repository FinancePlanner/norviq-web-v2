import { describe, expect, it } from 'vitest';
import { KEY_POSTHOG_CAPTURE_EVENT, KEY_POSTHOG_CAPTURE_PROPS, setPostHogCaptureOnce, takePostHogCaptureOnce } from './runtime.server.js';

// Port of the capture-once half of norviq-web session/posthog.go, against a
// stand-in with the Session surface these helpers use.
function fakeLocals(flags: Record<string, unknown> = {}) {
	let saves = 0;
	const session = {
		data: { flags, lastSeen: 0 },
		get: (k: string) => flags[k],
		async remove(...keys: string[]) {
			for (const k of keys) delete flags[k];
			saves++;
		},
		async save() {
			saves++;
		}
	};
	return { locals: { session } as unknown as App.Locals, flags, saves: () => saves };
}

describe('capture once', () => {
	it('stores the event and JSON properties under the Go keys, then pops them', async () => {
		const { locals, flags, saves } = fakeLocals();
		await setPostHogCaptureOnce(locals, 'user_logged_in', { method: 'email' });
		expect(flags).toEqual({ [KEY_POSTHOG_CAPTURE_EVENT]: 'user_logged_in', [KEY_POSTHOG_CAPTURE_PROPS]: '{"method":"email"}' });
		expect(saves()).toBe(1);

		expect(await takePostHogCaptureOnce(locals)).toEqual({ event: 'user_logged_in', properties: { method: 'email' } });
		expect(flags).toEqual({});
		expect(await takePostHogCaptureOnce(locals)).toBeNull();
	});

	it('drops stale properties when the new event has none', async () => {
		const { locals, flags } = fakeLocals({ [KEY_POSTHOG_CAPTURE_PROPS]: '{"x":1}' });
		await setPostHogCaptureOnce(locals, 'user_logged_out', null);
		expect(flags).toEqual({ [KEY_POSTHOG_CAPTURE_EVENT]: 'user_logged_out' });
		expect(await takePostHogCaptureOnce(locals)).toEqual({ event: 'user_logged_out' });
	});

	it('accepts an {event, properties} object under the event key', async () => {
		const { locals } = fakeLocals({ [KEY_POSTHOG_CAPTURE_EVENT]: { event: 'onboarding_completed', properties: { via: 'complete' } } });
		expect(await takePostHogCaptureOnce(locals)).toEqual({ event: 'onboarding_completed', properties: { via: 'complete' } });
	});

	it('ignores unparsable properties like Go', async () => {
		const { locals } = fakeLocals({ [KEY_POSTHOG_CAPTURE_EVENT]: 'e', [KEY_POSTHOG_CAPTURE_PROPS]: '{bad' });
		expect(await takePostHogCaptureOnce(locals)).toEqual({ event: 'e' });
	});
});
