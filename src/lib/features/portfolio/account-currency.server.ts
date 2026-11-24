import type { RequestEvent } from '@sveltejs/kit';
import { getJSON } from '#lib/features/dashboard/fetch.server.js';
import { accountCurrency, type AccountCurrency } from './account-currency.js';

/** GET /v1/portfolios → the currency the account's portfolios share (see account-currency.ts). */
export async function loadAccountCurrency(event: RequestEvent): Promise<AccountCurrency> {
	const res = await getJSON<{ items?: { baseCurrency?: string | null }[] }>(
		event,
		'/v1/portfolios'
	);
	return accountCurrency(res.data?.items);
}
