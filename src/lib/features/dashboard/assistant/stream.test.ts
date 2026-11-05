import { afterEach, describe, expect, test, vi } from 'vitest';
import {
	IMAGE_TOO_LARGE,
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
	test('402 shows the upgrade copy', async () => {
		expect(await run(new Response('', { status: 402 }))).toBe(UPGRADE_REQUIRED);
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
			onTurn: async () => {},
			assign
		});
		expect(text).toBe('');
		expect(assign).toHaveBeenCalledWith('/consent');
	});
});

describe('the composer survives a failed turn', () => {
	// The stream always opens before the turn runs, so image_rejected,
	// upgrade_required and the generic frame all arrive after it opened.
	// Nothing may report the message as taken until the turn frame arrives.
	function runSpied(response: Response) {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
		const accepted = vi.fn();
		const turn = vi.fn(async () => {});
		const options = {
			conversationId: 'c1',
			body: new FormData(),
			muse,
			onAccepted: accepted,
			onTurn: turn
		};
		return streamAssistantTurn(options).then((text) => ({ text, accepted, turn }));
	}

	test.each([
		[
			'image_rejected',
			'{"message":"Only JPEG, PNG, WebP and GIF images are supported.","code":"image_rejected"}'
		],
		['upgrade_required', '{"message":"Upgrade required.","code":"upgrade_required"}'],
		['the generic frame', '{"message":"The assistant could not complete this turn."}']
	])('an error frame (%s) does not clear the composer', async (_name, data) => {
		const { text, accepted, turn } = await runSpied(
			sse(
				'event: started\ndata: {}\n\n',
				`event: error\ndata: ${data}\n\n`,
				'event: done\ndata: {}\n\n'
			)
		);
		expect(text).not.toBe('');
		expect(accepted).not.toHaveBeenCalled();
		expect(turn).not.toHaveBeenCalled();
	});

	test('the turn frame hands over to onTurn exactly once', async () => {
		const { text, turn } = await runSpied(
			sse('event: started\ndata: {}\n\n', 'event: turn\ndata: {}\n\n', 'event: done\ndata: {}\n\n')
		);
		expect(text).toBe('');
		expect(turn).toHaveBeenCalledTimes(1);
	});
});
