// DS 2.0: one range vocabulary for every chart (spec § 5.5). The keys are what
// the UI shows, always uppercase; a feature that talks to the backend in
// another spelling maps them at its own boundary. The range lives in the URL
// query, so a chart never shows a range it didn't fetch.

export const RANGE_KEYS = ['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y', 'ALL'] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

/**
 * Portfolio and net-worth charts. No 1D (history is recorded once a day); YTD
 * stays hidden until API R4. Declared as a literal tuple so callers that parse
 * with it get the narrow type back.
 */
export const PORTFOLIO_RANGES = [
	'1W',
	'1M',
	'3M',
	'1Y',
	'ALL'
] as const satisfies readonly RangeKey[];

/** The query value as one of `allowed`, case-insensitively ('all' is 'ALL'); else `fallback`. */
export function parseRange<K extends RangeKey>(
	raw: string | null | undefined,
	allowed: readonly K[],
	fallback: K
): K {
	const v = (raw ?? '').trim().toUpperCase();
	return allowed.find((k) => k === v) ?? fallback;
}

/**
 * What rangeHref reads of a URL. A `URL` fits, and so does SvelteKit's
 * `page.url`, whose read-only `searchParams` type is not assignable to `URL`.
 */
export type RangeURL = Pick<URL, 'pathname' | 'search'>;

/** `pathname + search` of `url` with only `param` set to `range`; every other param is kept. */
export function rangeHref(url: RangeURL, param: string, range: RangeKey): string {
	const params = new URLSearchParams(url.search);
	params.set(param, range);
	return `${url.pathname}?${params}`;
}
