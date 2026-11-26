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

const apiJSON =
	vi.fn<(event: unknown, method: string, path: string, ...rest: unknown[]) => Promise<unknown>>();
vi.mock('#lib/server/api.js', () => ({
	apiJSON: (...args: Parameters<typeof apiJSON>) => apiJSON(...args),
	apiFetch: vi.fn<() => void>(),
	isAPIError: (e: unknown) => e instanceof FakeAPIError
}));
vi.mock('#lib/features/dashboard/ai-consent.server.js', () => ({
	aiConsentRequiredJSON: vi.fn<() => void>(),
	aiConsentReturnPath: vi.fn<() => void>(),
	hasAIConsent: vi.fn<() => void>()
}));

const {
	TRADES_CLOSED,
	TRADES_EXPIRED,
	confirmTrades,
	confirmHoldings,
	readHoldingsConfirmInput,
	loadAssistantPage,
	mapAssistantAction,
	attachPortfolioLists
} = await import('./assistant.server.js');

const event = { url: new URL('http://x/assistant') } as unknown as RequestEvent;
const input = { portfolioListId: 'L1', trades: [{ symbol: 'AAPL' }] };

const { TRADES_MAYBE_SAVED, TRADES_UNCONFIRMED } = await import('./trades.js');

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
			message: `Some trades need fixing. ${TRADES_CLOSED}`
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

	test('a 403 upgrade_required says Pro, not "try again"', async () => {
		apiJSON.mockRejectedValueOnce(new FakeAPIError(403, 'Upgrade required.', 'upgrade_required'));
		expect(await confirmTrades(event, 'a1', input)).toMatchObject({
			kind: 'tradesError',
			message: 'Saving trades from a screenshot is part of Pro.'
		});
	});

	test.each([
		['a 5xx', new FakeAPIError(500, '')],
		['a timeout or dropped connection', new Error('fetch failed')]
	])('%s with the action gone closes the card as maybe saved', async (_name, err) => {
		apiJSON.mockRejectedValueOnce(err).mockResolvedValueOnce([]);
		expect(await confirmTrades(event, 'a1', input)).toEqual({
			kind: 'tradesExpired',
			id: 'a1',
			message: TRADES_MAYBE_SAVED
		});
		expect(TRADES_MAYBE_SAVED).toBe(
			'This may have been saved. Check your portfolio before sending the screenshot again.'
		);
	});

	test.each([
		['a 5xx', new FakeAPIError(502, '')],
		['a timeout or dropped connection', new Error('fetch failed')]
	])('%s with the action still pending says the save is unconfirmed', async (_name, err) => {
		apiJSON.mockRejectedValueOnce(err).mockResolvedValueOnce([{ id: 'a1', status: 'pending' }]);
		expect(await confirmTrades(event, 'a1', input)).toEqual({
			kind: 'tradesError',
			id: 'a1',
			message: TRADES_UNCONFIRMED,
			rowErrors: []
		});
		expect(TRADES_UNCONFIRMED).toBe(
			"We couldn't confirm this save. Try again; if it went through, this card will say so."
		);
	});

	test('a 404 closes the card like a 409', async () => {
		apiJSON.mockRejectedValueOnce(new FakeAPIError(404, ''));
		expect(await confirmTrades(event, 'a1', input)).toEqual({
			kind: 'tradesExpired',
			id: 'a1',
			message: TRADES_EXPIRED
		});
		expect(apiJSON).toHaveBeenCalledTimes(1);
	});

	test('a 4xx does not refetch the action', async () => {
		apiJSON.mockRejectedValueOnce(new FakeAPIError(400, 'Bad request'));
		expect((await confirmTrades(event, 'a1', input)).kind).toBe('tradesError');
		expect(apiJSON).toHaveBeenCalledTimes(1);
	});

	test('a lost answer whose refetch also fails keeps the card as unconfirmed', async () => {
		apiJSON.mockRejectedValueOnce(new FakeAPIError(500, '')).mockRejectedValueOnce(new Error('x'));
		const out = await confirmTrades(event, 'a1', input);
		expect(out).toMatchObject({ kind: 'tradesError', message: TRADES_UNCONFIRMED, rowErrors: [] });
	});
});

describe('confirmHoldings', () => {
	const holdingsInput = {
		portfolioListId: 'L1',
		replaceExisting: false,
		rows: [{ symbol: 'AAPL', shares: 1, avgPrice: 2 }]
	};
	const collision = new FakeAPIError(
		422,
		'These holdings already exist: AAPL. Turn on \u201cReplace existing\u201d to update them.',
		'holdings_collision',
		{
			reason:
				'These holdings already exist: AAPL. Turn on \u201cReplace existing\u201d to update them.',
			code: 'holdings_collision',
			symbols: ['AAPL'],
			rows: [{ index: 0, message: 'Already held.' }]
		}
	);

	test('forwards the reviewed body as is and reports success', async () => {
		apiJSON.mockResolvedValueOnce({ message: 'Saved AAPL.' });
		const out = await confirmHoldings(event, 'a1', holdingsInput);
		expect(apiJSON).toHaveBeenCalledWith(
			event,
			'POST',
			'/v1/ai/assistant/actions/a1/confirm',
			holdingsInput
		);
		expect(out).toEqual({
			kind: 'result',
			vm: { id: 'a1', success: true, message: 'Saved AAPL.' }
		});
	});

	test('a 422 keeps the card with the backend reason, its rows and the colliding symbols', async () => {
		apiJSON
			.mockRejectedValueOnce(collision)
			.mockResolvedValueOnce([{ id: 'a1', status: 'pending' }]);
		expect(await confirmHoldings(event, 'a1', holdingsInput)).toEqual({
			kind: 'tradesError',
			id: 'a1',
			message: collision.reason,
			rowErrors: [{ index: 0, code: '', message: 'Already held.' }],
			collisionSymbols: ['AAPL']
		});
	});

	test('a 422 without a reason shows the fixed fallback, not undefined', async () => {
		apiJSON
			.mockRejectedValueOnce(new FakeAPIError(422, '', undefined, { message: 'nope' }))
			.mockResolvedValueOnce([{ id: 'a1', status: 'pending' }]);
		expect(await confirmHoldings(event, 'a1', holdingsInput)).toMatchObject({
			kind: 'tradesError',
			message: "Couldn't save these holdings. Try again."
		});
	});

	test('a 422 for a settled action closes the card', async () => {
		apiJSON.mockRejectedValueOnce(collision).mockResolvedValueOnce([]);
		expect(await confirmHoldings(event, 'a1', holdingsInput)).toEqual({
			kind: 'tradesExpired',
			id: 'a1',
			message: `${collision.reason} Those holdings were not saved and this card is closed. Send the file again.`
		});
	});

	test('a 409 is an expired card that names holdings, not trades', async () => {
		apiJSON.mockRejectedValueOnce(new FakeAPIError(409, 'Action is no longer available'));
		expect(await confirmHoldings(event, 'a1', holdingsInput)).toEqual({
			kind: 'tradesExpired',
			id: 'a1',
			message: 'This card expired. Send the file again.'
		});
	});

	test('a 403 upgrade_required says Pro for holdings', async () => {
		apiJSON.mockRejectedValueOnce(new FakeAPIError(403, 'Upgrade required.', 'upgrade_required'));
		expect(await confirmHoldings(event, 'a1', holdingsInput)).toMatchObject({
			kind: 'tradesError',
			message: 'Importing holdings from a file is part of Pro.'
		});
	});

	test('a lost answer with the action gone closes the card as maybe saved', async () => {
		apiJSON.mockRejectedValueOnce(new FakeAPIError(500, '')).mockResolvedValueOnce([]);
		expect(await confirmHoldings(event, 'a1', holdingsInput)).toEqual({
			kind: 'tradesExpired',
			id: 'a1',
			message: 'This may have been saved. Check your portfolio before sending the file again.'
		});
	});

	test('a 404 or 400 keeps the card open with the backend reason', async () => {
		for (const [status, reason] of [
			[404, 'Portfolio list not found.'],
			[400, 'Invalid portfolioListId.']
		] as const) {
			apiJSON.mockReset();
			apiJSON.mockRejectedValueOnce(new FakeAPIError(status, reason, undefined, { reason }));
			expect(await confirmHoldings(event, 'a1', holdingsInput)).toEqual({
				kind: 'tradesError',
				id: 'a1',
				message: reason,
				rowErrors: []
			});
			expect(apiJSON).toHaveBeenCalledTimes(1);
		}
	});

	test('a 4xx without a reason shows the exact fallback', async () => {
		apiJSON.mockRejectedValueOnce(new FakeAPIError(404, '', undefined, { message: 'x' }));
		expect(await confirmHoldings(event, 'a1', holdingsInput)).toMatchObject({
			kind: 'tradesError',
			message: "Couldn't save these holdings. Try again."
		});
	});

	test('readHoldingsConfirmInput needs a rows array and leaves a trades body alone', () => {
		expect(readHoldingsConfirmInput({ trades: [] })).toBeNull();
		expect(readHoldingsConfirmInput(null)).toBeNull();
		expect(readHoldingsConfirmInput({ rows: [{ symbol: 'A' }], replaceExisting: true })).toEqual({
			rows: [{ symbol: 'A' }],
			replaceExisting: true,
			portfolioListId: undefined
		});
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

	test('update_holdings gets its parsed card, or the plain one when unreadable', () => {
		const args = JSON.stringify({
			portfolioListId: 'L1',
			fromCsv: false,
			rows: [{ symbol: 'AAPL', shares: 1, avgPrice: 2, existing: 'none' }]
		});
		expect(mapAssistantAction(action('update_holdings', args)).holdings?.rows).toHaveLength(1);
		expect(mapAssistantAction(action('update_holdings', '???')).holdings).toBeNull();
		expect(mapAssistantAction(action('record_trades', args)).holdings).toBeUndefined();
	});

	test('unreadable record_trades arguments fall back to the plain card', () => {
		expect(mapAssistantAction(action('record_trades', '???')).trades).toBeNull();
	});
});

describe('attachPortfolioLists', () => {
	test('gives a holdings card the lists for its picker', async () => {
		apiJSON.mockResolvedValueOnce([{ id: 'L1', name: 'Main' }]);
		const card = { holdings: { rows: [] } } as never;
		const messages = [{ id: 'm', role: 'assistant', action: card }] as never[];
		await attachPortfolioLists(event, messages);
		expect((card as { portfolioLists: unknown }).portfolioLists).toEqual([
			{ id: 'L1', name: 'Main' }
		]);
	});

	test('asks only when a trades card exists', async () => {
		await attachPortfolioLists(event, [{ id: 'm', role: 'assistant' } as never]);
		expect(apiJSON).not.toHaveBeenCalled();
	});
});

describe('loadAssistantPage', () => {
	test('a preferences failure leaves images off and chat working', async () => {
		apiJSON.mockImplementation((_e: unknown, _m: string, path: string) => {
			if (path === '/v1/ai/assistant/conversations') return Promise.resolve([]);
			if (path === '/v1/ai/assistant/preferences') return Promise.reject(new FakeAPIError(500, ''));
			return Promise.resolve(null);
		});
		const vm = await loadAssistantPage(event);
		expect(vm.imagesEnabled).toBe(false);
		expect(vm.errorMessage).toBe('');
	});
});
