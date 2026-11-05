import { beforeEach, expect, test, vi } from 'vitest';

const apiJSON = vi.fn();
const refusal = vi.fn();
const requireFeature = vi.fn();
vi.mock('#lib/server/api.js', () => ({ apiJSON: (...a: unknown[]) => apiJSON(...a) }));
vi.mock('#lib/server/guards.js', () => ({
	requireFeature: (...a: unknown[]) => requireFeature(...a)
}));
vi.mock('#lib/billing.js', () => ({ Feature: { AIInsights: 'ai' } }));
vi.mock('#lib/features/dashboard/assistant/assistant.server.js', () => ({
	aiConsentRefusal: () => refusal()
}));

const { POST } = await import('./+server.js');
const call = () => POST({} as Parameters<typeof POST>[0]);

beforeEach(() => {
	apiJSON.mockReset();
	refusal.mockReset().mockResolvedValue(null);
	requireFeature.mockReset();
});

test('creates a conversation that leaves linked Telegram chats alone', async () => {
	apiJSON.mockResolvedValue({ id: 'c1' });
	const response = await call();
	expect(await response.json()).toEqual({ id: 'c1' });
	expect(apiJSON.mock.calls[0].slice(1)).toEqual([
		'POST',
		'/v1/ai/assistant/conversations',
		{ title: 'Quick Q', bindMessaging: false }
	]);
});

test('sits behind the same plan gate as full Q', async () => {
	requireFeature.mockRejectedValue(new Error('402'));
	await expect(call()).rejects.toThrow('402');
	expect(apiJSON).not.toHaveBeenCalled();
});

test('a missing consent is refused before anything is created', async () => {
	const refused = new Response('{}', { status: 403 });
	refusal.mockResolvedValue(refused);
	expect(await call()).toBe(refused);
	expect(apiJSON).not.toHaveBeenCalled();
});

test('a failed create answers 502', async () => {
	apiJSON.mockRejectedValue(new Error('down'));
	expect((await call()).status).toBe(502);
});
