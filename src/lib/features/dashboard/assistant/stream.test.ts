import { afterEach, describe, expect, test, vi } from 'vitest';
import {
	IMAGE_TOO_LARGE,
	IMAGES_BUSY,
	PLAN_NOT_CONFIRMED,
	TOO_MANY_REQUESTS,
	UPGRADE_REQUIRED,
	streamAssistantTurn
} from './stream.js';
import type { MuseChat } from './muse.svelte.js';

const muse = { begin() {}, tool() {}, celebrate() {}, fail() {} } as unknown as MuseChat;

function run(response: Response) {
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
	return streamAssistantTurn({
		conversationId: 'c1',
		body: new FormData(),
		muse,
		onAccepted: () => {},
		onTurn: async () => {}
	});
}

const sse = (...frames: string[]) =>
	new Response(frames.join(''), { status: 200, headers: { 'content-type': 'text/event-stream' } });

afterEach(() => vi.unstubAllGlobals());

describe('streamAssistantTurn errors', () => {
	test('413 shows the image-too-large copy', async () => {
		expect(await run(new Response('', { status: 413 }))).toBe(IMAGE_TOO_LARGE);
	});
	test('402 is neutral: it fires for text turns and failed plan lookups too', async () => {
		expect(await run(new Response('', { status: 402 }))).toBe(PLAN_NOT_CONFIRMED);
	});
	test('429 has its own plain message', async () => {
		expect(await run(new Response('', { status: 429 }))).toBe(TOO_MANY_REQUESTS);
	});
	test('an image_rejected frame shows its real reason', async () => {
		const text = await run(
			sse(
				'event: started\ndata: {}\n\n',
				'event: error\ndata: {"message":"Only JPEG, PNG, WebP and GIF images are supported.","code":"image_rejected"}\n\n',
				'event: done\ndata: {}\n\n'
			)
		);
		expect(text).toBe('Only JPEG, PNG, WebP and GIF images are supported.');
	});
	test('an upgrade_required frame is not shown as backend jargon', async () => {
		const text = await run(
			sse(
				'event: error\ndata: {"message":"Upgrade required. feature=screenshot_import plan=free required=pro","code":"upgrade_required"}\n\n'
			)
		);
		expect(text).toBe(UPGRADE_REQUIRED);
	});
	test('a 403 upgrade_required relay body shows the same copy', async () => {
		const res = new Response(JSON.stringify({ code: 'upgrade_required' }), { status: 403 });
		expect(await run(res)).toBe(UPGRADE_REQUIRED);
	});
	test('a consent refusal navigates and shows nothing', async () => {
		const assign = vi.fn();
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					new Response(
						JSON.stringify({ error: true, reason: 'AI_CONSENT_REQUIRED', consentUrl: '/consent' }),
						{ status: 403 }
					)
				)
		);
		const text = await streamAssistantTurn({
			conversationId: 'c1',
			body: new FormData(),
			muse,
			onAccepted: () => {},
			onTurn: async () => {},
			assign
		});
		expect(text).toBe('');
		expect(assign).toHaveBeenCalledWith('/consent');
	});
});

describe('consent and busy', () => {
	const consentFrame =
		'event: error\ndata: {"message":"Allow AI data sharing to use the assistant.","code":"ai_consent_required"}\n\n';
	test('an ai_consent_required frame raises the consent card and still returns the error', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(sse('event: started\ndata: {}\n\n', consentFrame))
		);
		const calls: string[] = [];
		const text = await streamAssistantTurn({
			conversationId: 'c1',
			body: new FormData(),
			muse,
			onAccepted: () => calls.push('accepted'),
			onTurn: async () => {},
			onConsentRequired: () => calls.push('consent')
		});
		expect(calls).toEqual(['accepted', 'consent']);
		expect(text).toBe('Allow AI data sharing to use the assistant.');
	});
	test('other error frames do not raise the consent card', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(sse('event: error\ndata: {"message":"x","code":"image_rejected"}\n\n'))
		);
		const onConsentRequired = vi.fn();
		await streamAssistantTurn({
			conversationId: 'c1',
			body: new FormData(),
			muse,
			onAccepted: () => {},
			onTurn: async () => {},
			onConsentRequired
		});
		expect(onConsentRequired).not.toHaveBeenCalled();
	});
	test('a 503 shows the backend reason and never opens the stream', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					new Response('Too many large images right now. Try again in a moment.', { status: 503 })
				)
		);
		const onAccepted = vi.fn();
		const text = await streamAssistantTurn({
			conversationId: 'c1',
			body: new FormData(),
			muse,
			onAccepted,
			onTurn: async () => {}
		});
		expect(text).toBe(IMAGES_BUSY);
		expect(onAccepted).not.toHaveBeenCalled();
	});
	test('a 503 shows the relayed text, and the generic line when the body is empty', async () => {
		expect(await run(new Response('Busy for now.', { status: 503 }))).toBe('Busy for now.');
		expect(await run(new Response('', { status: 503 }))).toBe('Assistant unavailable');
	});
});

describe('streamAssistantTurn and the composer', () => {
	function runSpied(response: Response) {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
		const calls: string[] = [];
		return streamAssistantTurn({
			conversationId: 'c1',
			body: new FormData(),
			muse,
			onAccepted: () => calls.push('accepted'),
			onTurn: async () => {
				calls.push('turn');
			}
		}).then((text) => ({ text, calls }));
	}

	test('an error frame arrives after the stream opened, so the caller must restore', async () => {
		const { text, calls } = await runSpied(
			sse(
				'event: started\ndata: {}\n\n',
				'event: error\ndata: {"message":"Only JPEG, PNG, WebP and GIF images are supported.","code":"image_rejected"}\n\n',
				'event: done\ndata: {}\n\n'
			)
		);
		expect(calls).toEqual(['accepted']);
		expect(text).not.toBe('');
	});

	test('the turn frame follows the open, once', async () => {
		const { text, calls } = await runSpied(
			sse('event: started\ndata: {}\n\n', 'event: turn\ndata: {}\n\n', 'event: done\ndata: {}\n\n')
		);
		expect(calls).toEqual(['accepted', 'turn']);
		expect(text).toBe('');
	});

	test('a status failure never opens the stream', async () => {
		const { text, calls } = await runSpied(new Response('', { status: 429 }));
		expect(calls).toEqual([]);
		expect(text).not.toBe('');
	});
});

describe('an expired conversation', () => {
	test('a conversation_not_found frame calls onConversationGone and shows its message', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					sse(
						'event: error\ndata: {"message":"This conversation no longer exists.","code":"conversation_not_found"}\n\n'
					)
				)
		);
		const onConversationGone = vi.fn();
		const text = await streamAssistantTurn({
			conversationId: 'c1',
			body: new FormData(),
			muse,
			onAccepted: () => {},
			onTurn: async () => {},
			onConversationGone
		});
		expect(onConversationGone).toHaveBeenCalledOnce();
		expect(text).toBe('This conversation no longer exists.');
	});
});
