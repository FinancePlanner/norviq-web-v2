// The stock page's server fragments: quote refresh (quote_refresh.go),
// earnings transcript (LoadStockEarningsTranscript) and the valuation form
// (stock_valuation.go).

import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { apiFetch, apiJSON, isAPIError } from '#lib/server/api.js';
import { changeClass, formatCurrency, formatSignedPercent } from '#lib/format.js';
import { fetchQuoteBatch, formatShares, quoteBySymbol, quoteRefreshStatusTime } from '#lib/features/portfolio/market.server.js';
import { findPortfolioStock } from './detail.server.js';
import type { QuoteVM, TranscriptViewModel, ValuationFormVM, ValuationResult } from './detail.js';

type S = components['schemas'];
const enc = encodeURIComponent;

/** LoadStockDetailQuoteViewModel: null where Go answered 404. */
export async function loadStockDetailQuote(event: RequestEvent, rawSymbol: string): Promise<QuoteVM | null> {
	const symbol = rawSymbol.trim().toUpperCase();
	const vm: QuoteVM = {
		symbol,
		hasPosition: false,
		currentPrice: 'Pending',
		changePercent: '-',
		changeClass: 'neutral',
		positionValue: 'Pending',
		costBasis: '-',
		updatedAt: quoteRefreshStatusTime(new Date())
	};
	if (symbol === '') return null;
	const { item: position, error } = await findPortfolioStock(event, symbol);
	if (error) {
		console.warn('stock quote refresh position fetch failed', symbol, error);
		return null;
	}
	if (position) {
		vm.hasPosition = true;
		vm.costBasis = formatCurrency(position.shares * position.buyPrice);
		vm.positionValue = formatCurrency(position.shares * position.buyPrice);
	}
	const q = quoteBySymbol(await fetchQuoteBatch(event, [symbol])).get(symbol);
	if (q) {
		vm.currentPrice = formatCurrency(q.c);
		if (position) vm.positionValue = formatCurrency(position.shares * q.c);
		if (q.dp != null) {
			vm.changePercent = formatSignedPercent(q.dp);
			vm.changeClass = changeClass(q.dp);
		}
	}
	return vm;
}

export async function loadStockEarningsTranscript(event: RequestEvent, rawSymbol: string, dateISO: string): Promise<TranscriptViewModel> {
	const symbol = rawSymbol.trim().toUpperCase();
	const vm: TranscriptViewModel = { symbol, date: dateISO, quarter: '', content: '', error: '' };
	if (symbol === '' || dateISO.trim() === '') {
		vm.error = 'Transcript is unavailable right now.';
		return vm;
	}
	const date = dateISO.trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T00:00:00Z'))) {
		vm.error = 'Invalid earnings date.';
		return vm;
	}
	let resp: S['EarningsTranscriptResponse'] | null = null;
	try {
		resp = await apiJSON<S['EarningsTranscriptResponse']>(event, 'GET', `/v1/market/earnings/${enc(symbol)}/transcript`, undefined, { query: { date } });
	} catch {
		resp = null;
	}
	if (!resp) {
		vm.error = 'Could not load this transcript.';
		return vm;
	}
	const body = (resp.content ?? '').trim();
	if (body === '') {
		vm.error = 'This transcript has no content yet.';
		return vm;
	}
	vm.content = body;
	vm.quarter = `Q${resp.quarter} ${resp.year}`;
	return vm;
}

/** formatFloatInput (stock_valuation.go). */
function formatFloatInput(v: number): string {
	const s = formatShares(v).replace(/0+$/, '').replace(/\.+$/, '');
	return s === '' ? '0' : s;
}

export async function loadValuationForm(event: RequestEvent, rawSymbol: string): Promise<ValuationFormVM> {
	const symbol = rawSymbol.trim().toUpperCase();
	const vm: ValuationFormVM = {
		symbol: symbol.toLowerCase(),
		exists: false,
		bearLow: '',
		bearHigh: '',
		baseLow: '',
		baseHigh: '',
		bullLow: '',
		bullHigh: '',
		rationale: '',
		targetDate: ''
	};
	try {
		const v = await apiJSON<S['StockValuationRequest']>(event, 'GET', `/v1/stocks/symbol/${enc(symbol)}/valuation`);
		if (v) {
			vm.exists = true;
			vm.bearLow = formatFloatInput(v.bearCase.low);
			vm.bearHigh = formatFloatInput(v.bearCase.high);
			vm.baseLow = formatFloatInput(v.baseCase.low);
			vm.baseHigh = formatFloatInput(v.baseCase.high);
			vm.bullLow = formatFloatInput(v.bullCase.low);
			vm.bullHigh = formatFloatInput(v.bullCase.high);
			if (v.rationale != null) vm.rationale = v.rationale.trim();
			if (v.targetDate) vm.targetDate = v.targetDate.slice(0, 10);
		}
	} catch {
		// Go rendered the empty create form on any failure.
	}
	return vm;
}

/** parsePositiveFloat (onboarding.go): "," as decimal point, must be > 0. */
function parsePositiveFloat(raw: string): number | null {
	const s = raw.replaceAll(',', '.');
	if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s) && !/^[+-]?(inf|infinity)$/i.test(s)) return null;
	const v = Number(s.replace(/^([+-]?)inf(inity)?$/i, '$1Infinity'));
	if (Number.isNaN(v) || v <= 0) return null;
	return v;
}

function parseStockValuationForm(form: FormData, symbol: string): { body: S['StockValuationRequest'] | null; error: string } {
	const val = (k: string) => String(form.get(k) ?? '').trim();
	const parseRange = (lowKey: string, highKey: string) => {
		const low = parsePositiveFloat(val(lowKey));
		const high = parsePositiveFloat(val(highKey));
		if (low == null || high == null || low > high) return null;
		return { low, high };
	};
	const bear = parseRange('bear_low', 'bear_high');
	if (!bear) return { body: null, error: 'Enter valid bear case low and high prices.' };
	const base = parseRange('base_low', 'base_high');
	if (!base) return { body: null, error: 'Enter valid base case low and high prices.' };
	const bull = parseRange('bull_low', 'bull_high');
	if (!bull) return { body: null, error: 'Enter valid bull case low and high prices.' };
	const body: S['StockValuationRequest'] = { symbol, bearCase: bear, baseCase: base, bullCase: bull };
	const rationale = val('rationale');
	if (rationale) body.rationale = rationale;
	const rawDate = val('target_date');
	if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate) && !Number.isNaN(Date.parse(rawDate + 'T00:00:00Z'))) body.targetDate = rawDate;
	return { body, error: '' };
}

/** StockValuationSave. */
export async function saveValuation(event: RequestEvent, rawSymbol: string, form: FormData): Promise<ValuationResult> {
	const symbol = rawSymbol.trim().toUpperCase();
	const { body, error } = parseStockValuationForm(form, symbol);
	if (!body) return { panel: 'error', message: error };

	let create = false;
	try {
		await apiJSON(event, 'GET', `/v1/stocks/symbol/${enc(symbol)}/valuation`);
	} catch (err) {
		// Go: create only on a 404 (or no response at all).
		create = !isAPIError(err) || err.status === 404;
	}
	try {
		// Go checked only the transport error: a 4xx/5xx answer still redirected.
		await apiFetch(event, create ? 'POST' : 'PUT', `/v1/stocks/symbol/${enc(symbol)}/valuation`, JSON.stringify(body), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.warn('save stock valuation failed', symbol, err);
		return { panel: 'error', message: 'Could not save valuation. Check your ranges and try again.' };
	}
	return { redirect: '/portfolio/' + symbol.toLowerCase() };
}
