import { beforeEach, expect, test, vi } from 'vitest';

const apiFetch = vi.fn<(...args: unknown[]) => Promise<Response>>();
vi.mock('#lib/server/api.js', () => ({
	apiFetch: (...a: unknown[]) => apiFetch(...a),
	api: vi.fn<() => unknown>(),
	isAPIError: () => false
}));

const { processCSVUpload } = await import('./import.server.js');
const { afterImportPath } = await import('./onboarding.server.js');

const LIST = '3f1c2a4e-5b6d-4e7f-8a9b-0c1d2e3f4a5b';

function csvEvent(fields: Record<string, string> = {}) {
	const form = new FormData();
	form.set('provider', 'generic');
	for (const [k, v] of Object.entries(fields)) form.set(k, v);
	form.set('file', new File(['symbol,shares\nAAPL,1'], 'a.csv', { type: 'text/csv' }));
	return { request: new Request('http://x/', { method: 'POST', body: form }) } as never;
}

const json = (body: unknown) =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});

beforeEach(() => apiFetch.mockReset());

test('preview and commit send portfolioListId next to provider', async () => {
	apiFetch.mockResolvedValue(json({ items: [], errors: [], inserted: [], updated: [] }));
	await processCSVUpload(csvEvent({ portfolio_list_id: LIST }), false);
	await processCSVUpload(csvEvent({ portfolio_list_id: LIST }), true);
	expect(apiFetch.mock.calls[0][2]).toBe('/v1/brokers/import/csv');
	expect(apiFetch.mock.calls[0][4]).toEqual({
		query: { provider: 'generic', portfolioListId: LIST }
	});
	expect(apiFetch.mock.calls[1][2]).toBe('/v1/brokers/import/csv/commit');
	expect(apiFetch.mock.calls[1][4]).toEqual({
		query: { provider: 'generic', portfolioListId: LIST }
	});
});

test('a non-UUID portfolio id is omitted', async () => {
	apiFetch.mockResolvedValue(json({ items: [], errors: [] }));
	await processCSVUpload(csvEvent({ portfolio_list_id: 'not-a-uuid' }), false);
	expect(apiFetch.mock.calls[0][4]).toEqual({ query: { provider: 'generic' } });
});

test('preview rows carry the replace note fields', async () => {
	apiFetch.mockResolvedValue(
		json({
			items: [
				{ line: 2, symbol: 'AAPL', shares: 1, willReplaceExistingImport: true },
				{ line: 3, symbol: 'MSFT', shares: 1, existingPositionKind: 'manual' },
				{ line: 4, symbol: 'TSLA', shares: 1, existingPositionKind: 'none' }
			],
			errors: []
		})
	);
	const vm = await processCSVUpload(csvEvent(), false);
	expect(vm.rows.map((r) => r.replacesExisting)).toEqual([true, true, false]);
	// Only holdings this import does not own need the merge confirmation.
	expect(vm.rows.map((r) => r.foreignHolding)).toEqual([false, true, false]);
});

test('commit sends confirmMergeExisting only when ticked', async () => {
	apiFetch.mockResolvedValue(json({ inserted: [], updated: [], errors: [] }));
	await processCSVUpload(csvEvent(), true);
	await processCSVUpload(csvEvent({ confirm_merge_existing: '1' }), true);
	expect(apiFetch.mock.calls[0][4]).toEqual({ query: { provider: 'generic' } });
	expect(apiFetch.mock.calls[1][4]).toEqual({
		query: { provider: 'generic', confirmMergeExisting: 'true' }
	});
	apiFetch.mockClear();
	apiFetch.mockResolvedValue(json({ items: [], errors: [] }));
	await processCSVUpload(csvEvent({ confirm_merge_existing: '1' }), false);
	expect(apiFetch.mock.calls[0][4]).toEqual({ query: { provider: 'generic' } });
});

test('a 409 shows the backend reason and keeps the rows to confirm', async () => {
	const reason = 'These holdings already exist and were not created by this import: MSFT.';
	apiFetch
		.mockResolvedValueOnce(new Response(JSON.stringify({ reason }), { status: 409 }))
		.mockResolvedValueOnce(
			json({
				items: [{ line: 2, symbol: 'MSFT', shares: 1, existingPositionKind: 'manual' }],
				errors: []
			})
		);
	const vm = await processCSVUpload(csvEvent(), true);
	expect(vm.error).toBe(reason);
	expect(vm.needsMergeConfirm).toBe(true);
	expect(vm.committed).toBe(false);
	expect(vm.rows.map((r) => r.symbol)).toEqual(['MSFT']);
	expect(apiFetch.mock.calls[1][2]).toBe('/v1/brokers/import/csv');
});

test('another 4xx with a reason shows it; without one the generic error stays', async () => {
	apiFetch.mockResolvedValueOnce(
		new Response(JSON.stringify({ reason: 'Bad CSV.' }), { status: 400 })
	);
	expect((await processCSVUpload(csvEvent(), true)).error).toBe('Bad CSV.');
	apiFetch.mockResolvedValueOnce(new Response('nope', { status: 500 }));
	expect((await processCSVUpload(csvEvent(), true)).error).toBe(
		'Import failed. Check the file format and try again.'
	);
});

const ev = (complete: boolean) => ({ locals: { session: { get: () => complete } } }) as never;

test('afterImportPath lands an onboarded csv import on the chosen portfolio', () => {
	expect(afterImportPath(ev(true), 'csv', LIST)).toBe('/portfolio?portfolio=' + LIST);
	expect(afterImportPath(ev(true), 'csv')).toBe('/portfolio');
	expect(afterImportPath(ev(true), 'csv', 'junk')).toBe('/portfolio');
	expect(afterImportPath(ev(false), 'csv', LIST)).toBe('/onboarding/budget');
	expect(afterImportPath(ev(true), 'manual')).toBe('/settings/integrations?import=manual');
});
