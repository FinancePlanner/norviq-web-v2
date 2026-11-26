import { expect, test, vi } from 'vitest';

const confirmTrades = vi.fn<(...args: unknown[]) => Promise<{ kind: string }>>(() =>
	Promise.resolve({ kind: 'result' })
);
const confirmHoldings = vi.fn<(...args: unknown[]) => Promise<{ kind: string }>>(() =>
	Promise.resolve({ kind: 'result' })
);
vi.mock('#lib/server/guards.js', () => ({ requireFeature: vi.fn<() => void>() }));
vi.mock('#lib/billing.js', () => ({ Feature: { AIInsights: 'ai' } }));
vi.mock('#lib/features/dashboard/assistant/assistant.server.js', () => ({
	confirmAction: vi.fn<() => void>(),
	confirmTrades: (...a: unknown[]) => confirmTrades(...a),
	confirmHoldings: (...a: unknown[]) => confirmHoldings(...a),
	readHoldingsConfirmInput: (raw: { rows?: unknown } | null) => (raw?.rows ? raw : null),
	formOf: vi.fn<() => void>(),
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

test('a body with rows is the holdings card and goes to confirmHoldings, not confirmTrades', async () => {
	confirmTrades.mockClear();
	const request = new Request('http://x/c', {
		method: 'POST',
		body: '{"portfolioListId":"L","replaceExisting":false,"rows":[{"symbol":"AAPL"}]}',
		headers: { 'content-type': 'application/json' }
	});
	expect((await call(request)).status).toBe(200);
	expect(confirmHoldings).toHaveBeenCalledTimes(1);
	expect(confirmTrades).not.toHaveBeenCalled();
});
