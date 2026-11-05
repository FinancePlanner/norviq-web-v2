import { expect, test, vi } from 'vitest';

const confirmTrades = vi.fn(async () => ({ kind: 'result' }));
vi.mock('#lib/server/guards.js', () => ({ requireFeature: vi.fn() }));
vi.mock('#lib/billing.js', () => ({ Feature: { AIInsights: 'ai' } }));
vi.mock('#lib/features/dashboard/assistant/assistant.server.js', () => ({
	confirmAction: vi.fn(),
	confirmTrades: (...a: unknown[]) => (confirmTrades as (...x: unknown[]) => unknown)(...a),
	formOf: vi.fn(),
	parseUUID: (s: string) => s,
	readTradesConfirmInput: (raw: unknown) => raw
}));

const { POST } = await import('./+server.js');
const call = (request: Request) =>
	POST({ request, params: { id: 'a1' } } as unknown as Parameters<typeof POST>[0]);

test('an oversized trades body is refused with 413 before it is parsed', async () => {
	const request = new Request('http://x/c', {
		method: 'POST',
		body: '{}',
		headers: { 'content-type': 'application/json', 'content-length': String((256 << 10) + 1) }
	});
	expect((await call(request)).status).toBe(413);
	expect(confirmTrades).not.toHaveBeenCalled();
});

test('a normal trades body is forwarded', async () => {
	const request = new Request('http://x/c', {
		method: 'POST',
		body: '{"trades":[]}',
		headers: { 'content-type': 'application/json' }
	});
	expect((await call(request)).status).toBe(200);
	expect(confirmTrades).toHaveBeenCalledTimes(1);
});
