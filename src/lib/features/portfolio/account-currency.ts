// The account's currency, for totals that are not scoped to one portfolio.
//
// An unscoped portfolio call (summary, performance, pnl without a
// portfolioListId) answers baseCurrency "USD" whatever the portfolios hold:
// the backend's default (portfolio/filter.go), not data. The real currency is
// each portfolio's baseCurrency from GET /v1/portfolios:
// - one shared value: the account's currency;
// - different values: none (mixed), so a total prints per currency or " —";
// - none known: null, never a default "$".

export interface AccountCurrency {
	currency: string | null;
	mixed: boolean;
}

export function accountCurrency(
	items: { baseCurrency?: string | null }[] | null | undefined
): AccountCurrency {
	const codes = new Set<string>();
	for (const p of items ?? []) {
		const c = (p.baseCurrency ?? '').trim().toUpperCase();
		if (/^[A-Z]{3}$/.test(c)) codes.add(c);
	}
	if (codes.size === 1) return { currency: [...codes][0], mixed: false };
	return { currency: null, mixed: codes.size > 1 };
}
