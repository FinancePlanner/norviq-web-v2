import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

class FakeAPIError extends Error {
	constructor(
		public status: number,
		public reason: string,
		public code?: string,
		public body?: unknown
	) {
		super(reason);
	}
}

const apiJSON = vi.fn();
vi.mock('#lib/server/api.js', () => ({
	apiJSON: (...args: unknown[]) => apiJSON(...args),
	apiFetch: vi.fn(),
	isAPIError: (e: unknown) => e instanceof FakeAPIError
}));
vi.mock('#lib/features/dashboard/ai-consent.server.js', () => ({
	aiConsentRequiredJSON: vi.fn(),
	aiConsentReturnPath: vi.fn(),
	hasAIConsent: vi.fn()
}));

const {
	TRADES_CLOSED,
	TRADES_EXPIRED,
	confirmTrades,
	loadAssistantPage,
	mapAssistantAction,
	attachPortfolioLists
} = await import('./assistant.server.js');

const event = { url: new URL('http://x/assistant') } as unknown as RequestEvent;
const input = { portfolioListId: 'L1', trades: [{ symbol: 'AAPL' }] };

const refusal = (rowErrors: unknown[]) =>
	new FakeAPIError(422, 'Some trades need fixing.', undefined, {
		reason: 'Some trades need fixing.',
		rowErrors
	});

beforeEach(() => apiJSON.mockReset());

describe('confirmTrades', () => {
	test('forwards the reviewed rows and reports success', async () => {
		apiJSON.mockResolvedValueOnce({ message: 'Recorded 1 trade.' });
		const out = await confirmTrades(event, 'a1', input);
		expect(apiJSON).toHaveBeenCalledWith(
			event,
			'POST',
			'/v1/ai/assistant/actions/a1/confirm',
			input
		);
		expect(out).toEqual({
			kind: 'result',
			vm: { id: 'a1', success: true, message: 'Recorded 1 trade.' }
		});
	});

	test('422 maps rowErrors to the card and keeps it open while the action is pending', async () => {
		apiJSON
			.mockRejectedValueOnce(
				refusal([{ index: 1, code: 'unknown_symbol', message: 'No such symbol.' }])
			)
			.mockResolvedValueOnce([{ id: 'a1', status: 'pending' }]);
		expect(await confirmTrades(event, 'a1', input)).toEqual({
			kind: 'tradesError',
			id: 'a1',
			message: 'Some trades need fixing.',
			rowErrors: [{ index: 1, code: 'unknown_symbol', message: 'No such symbol.' }]
		});
	});

	test('422 for a settled action closes the card instead of leaving it saveable', async () => {
		apiJSON.mockRejectedValueOnce(refusal([])).mockResolvedValueOnce([]);
		expect(await confirmTrades(event, 'a1', input)).toEqual({
			kind: 'tradesExpired',
			id: 'a1',
			message: TRADES_CLOSED
		});
	});

	test('422 whose re-fetch fails keeps the card with the refusal', async () => {
		apiJSON.mockRejectedValueOnce(refusal([])).mockRejectedValueOnce(new FakeAPIError(500, ''));
		expect((await confirmTrades(event, 'a1', input)).kind).toBe('tradesError');
	});

	test('409 is an expired review', async () => {
		apiJSON.mockRejectedValueOnce(new FakeAPIError(409, 'Action is no longer available'));
		expect(await confirmTrades(event, 'a1', input)).toEqual({
			kind: 'tradesExpired',
			id: 'a1',
			message: TRADES_EXPIRED
		});
		expect(TRADES_EXPIRED).toBe('This review expired. Send the screenshot again.');
	});

	test('any other failure keeps the card with a retry line', async () => {
		apiJSON.mockRejectedValueOnce(new FakeAPIError(500, ''));
		const out = await confirmTrades(event, 'a1', input);
		expect(out).toMatchObject({ kind: 'tradesError', rowErrors: [] });
	});
});

describe('mapAssistantAction', () => {
	const action = (toolName: string, args: string) =>
		({
			id: 'a1',
			summary: 'Record 1 buy.',
			expiresAt: '2026-11-05T10:00:00Z',
			status: 'pending',
			toolName,
			arguments: args
		}) as Parameters<typeof mapAssistantAction>[0];

	test('record_trades gets its parsed card', () => {
		const args = JSON.stringify({
			portfolio_list_id: 'L1',
			skipped_rows: 0,
			base_currency: 'USD',
			synced: false,
			trades: [
				{ symbol: 'AAPL', side: 'buy', quantity: 1, price: 2, trade_date: '2024-03-10', issues: [] }
			]
		});
		expect(mapAssistantAction(action('record_trades', args)).trades?.rows).toHaveLength(1);
	});

	test('unreadable record_trades arguments fall back to the plain card', () => {
		expect(mapAssistantAction(action('record_trades', '???')).trades).toBeNull();
	});
});

describe('attachPortfolioLists', () => {
	test('asks only when a trades card exists', async () => {
		await attachPortfolioLists(event, [{ id: 'm', role: 'assistant' } as never]);
		expect(apiJSON).not.toHaveBeenCalled();
	});
});

describe('loadAssistantPage', () => {
	test('a preferences failure leaves images off and chat working', async () => {
		apiJSON.mockImplementation(async (_e: unknown, _m: string, path: string) => {
			if (path === '/v1/ai/assistant/conversations') return [];
			if (path === '/v1/ai/assistant/preferences') throw new FakeAPIError(500, '');
			return null;
		});
		const vm = await loadAssistantPage(event);
		expect(vm.imagesEnabled).toBe(false);
		expect(vm.errorMessage).toBe('');
	});
});
