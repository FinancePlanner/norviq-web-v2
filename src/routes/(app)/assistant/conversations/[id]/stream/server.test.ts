import { beforeEach, expect, test, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

const apiFetch = vi.fn();
vi.mock('#lib/server/api.js', () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));
vi.mock('#lib/server/guards.js', () => ({ requireFeature: vi.fn() }));
vi.mock('#lib/billing.js', () => ({ Feature: { AIInsights: 'ai' } }));
vi.mock('#lib/features/dashboard/ai-consent.server.js', () => ({
	AI_CONSENT_REQUIRED: 'AI_CONSENT_REQUIRED',
	aiConsentRequiredJSON: vi.fn(),
	aiConsentReturnPath: vi.fn()
}));
vi.mock('#lib/features/dashboard/assistant/assistant.server.js', async () => ({
	aiConsentRefusal: async () => null,
	parseUUID: (s: string) => s,
	formOf: async (e: RequestEvent) => e.request.formData()
}));

const { POST } = await import('./+server.js');

function call(form: FormData) {
	const request = new Request('http://x/assistant/conversations/c1/stream', {
		method: 'POST',
		body: form
	});
	return POST({ request, params: { id: 'c1' } } as unknown as Parameters<typeof POST>[0]);
}

beforeEach(() => {
	apiFetch.mockReset();
	apiFetch.mockResolvedValue(new Response('event: done\ndata: {}\n\n'));
});

test('a text turn goes upstream as JSON', async () => {
	const form = new FormData();
	form.set('content', ' hello ');
	await call(form);
	const [, , , body, opts] = apiFetch.mock.calls[0];
	expect(body).toBe('{"content":"hello"}');
	expect(opts.headers['Content-Type']).toBe('application/json');
});

test('an empty file input is still a text turn', async () => {
	const form = new FormData();
	form.set('content', 'hello');
	form.append('image', new File([], ''));
	await call(form);
	expect(apiFetch.mock.calls[0][3]).toBe('{"content":"hello"}');
});

test('attached images go upstream as multipart with content and image parts', async () => {
	const form = new FormData();
	form.set('content', 'what is this');
	form.append('image', new File([new Uint8Array([1, 2, 3])], 'a.jpg', { type: 'image/jpeg' }));
	await call(form);
	const [, , , body, opts] = apiFetch.mock.calls[0];
	expect(body).toBeInstanceOf(FormData);
	expect((body as FormData).get('content')).toBe('what is this');
	expect((body as FormData).getAll('image')).toHaveLength(1);
	expect(opts.headers['Content-Type']).toBeUndefined();
});

test('images alone are allowed, empty text alone is not', async () => {
	const withImage = new FormData();
	withImage.append('image', new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' }));
	expect((await call(withImage)).status).toBe(200);
	expect((await call(new FormData())).status).toBe(400);
});

test('a body over the cap is refused with 413 before it is read', async () => {
	const request = new Request('http://x/s', {
		method: 'POST',
		body: new FormData(),
		headers: { 'content-length': String((16 << 20) + 1) }
	});
	const res = await POST({ request, params: { id: 'c1' } } as unknown as Parameters<
		typeof POST
	>[0]);
	expect(res.status).toBe(413);
	expect(apiFetch).not.toHaveBeenCalled();
});

test('an upstream 403 upgrade_required (body has error, not reason) does too', async () => {
	apiFetch.mockResolvedValue(
		new Response('{"success":false,"code":"upgrade_required","error":"Upgrade required."}', {
			status: 403
		})
	);
	const form = new FormData();
	form.set('content', 'hi');
	const res = await call(form);
	expect(await res.json()).toEqual({ code: 'upgrade_required' });
});
