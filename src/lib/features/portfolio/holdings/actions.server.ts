import { noteGuidedAction } from '../../auth-onboarding/guided-start/guided.server.js';
import { json, text, type RequestEvent } from '@sveltejs/kit';
import { formatFloat } from '#lib/format.js';
import { Feature, isFeatureAvailable, isPro } from '#lib/billing.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import { parseUUID } from '../market.server.js';
import {
	addPositionFormDefaults,
	createStockErrorMessage,
	createTargetErrorMessage,
	formStr,
	goParseFloat,
	loadPositionForm,
	lookupTargetForSymbol,
	normalizePortfolioTimeRange,
	parseAddPositionRequest,
	pilotManagedReason,
	portfolioRedirectURL,
	portfolioRedirectURLForPortfolio,
	rawCall,
	sellStockErrorMessage,
	targetAlertDirection,
	today,
	updateStockErrorMessage,
	validDate
} from './holdings.server.js';
import type {
	AddPositionFormVM,
	EditPositionFormVM,
	PositionActionResult,
	PriceAlertFormVM,
	SellPositionFormVM
} from './types.js';

// The holdings position endpoints: handlers/portfolio_position.go and
// portfolio_position_actions.go. Go answered HTMX with an HTML panel (200) or
// an HX-Redirect; these answer the same thing as JSON (PositionActionResult).
// Failures stay plain-text non-2xx responses, which the page ignores exactly as
// htmx did (noSwap 4xx/5xx).

const panel = (r: PositionActionResult) => json(r);
const redirectTo = (url: string) => json({ redirect: url } satisfies PositionActionResult);

async function readForm(event: RequestEvent): Promise<FormData | null> {
	try {
		return await event.request.formData();
	} catch {
		return null;
	}
}

/** middleware.RequireFeature(TargetAlerts, "Price alerts"): 402 the page ignores. */
async function targetAlertsGate(
	event: RequestEvent
): Promise<{ blocked: Response | null; pro: boolean }> {
	const billing = await loadBillingContext(event);
	if (!isFeatureAvailable(billing, Feature.TargetAlerts)) {
		return { blocked: text('Price alerts', { status: 402 }), pro: false };
	}
	return { blocked: null, pro: isPro(billing) };
}

// ---------------------------------------------------------------------------
// POST /portfolio/positions

export async function createPosition(event: RequestEvent): Promise<Response> {
	const f = await readForm(event);
	if (!f)
		return panel({
			panel: 'add',
			form: addPositionFormDefaults({ ...emptyAdd(), error: 'Invalid form submission.' })
		});
	const { req, form, error } = parseAddPositionRequest(f);
	if (!req) return panel({ panel: 'add', form: addPositionFormDefaults({ ...form, error }) });

	const res = await rawCall(event, 'POST', '/v1/stocks', req);
	if (!(res.status === 200 || res.status === 201)) {
		return panel({
			panel: 'add',
			form: addPositionFormDefaults({ ...form, error: createStockErrorMessage(res) })
		});
	}
	await noteGuidedAction(event, 'add_holding');
	return redirectTo(portfolioRedirectURLForPortfolio(form.range, form.portfolioID));
}

function emptyAdd(): AddPositionFormVM {
	return {
		portfolioID: '',
		symbol: '',
		category: '',
		shares: '',
		buyPrice: '',
		buyDate: '',
		notes: '',
		range: '',
		error: '',
		currentPortfolioValue: 0
	};
}

// ---------------------------------------------------------------------------
// GET /portfolio/positions/{id}/edit

export async function editForm(event: RequestEvent, id: string): Promise<Response> {
	const loaded = await loadPositionForm(event, id);
	if (!loaded.ok) return text(loaded.message, { status: loaded.status });
	loaded.form.range = normalizePortfolioTimeRange(event.url.searchParams.get('range'));
	return panel({ panel: 'edit', form: loaded.form });
}

// PUT /portfolio/positions/{id}

export async function updatePosition(event: RequestEvent, id: string): Promise<Response> {
	const stockID = parseUUID(id);
	if (!stockID) return text('Invalid position', { status: 400 });
	const f = await readForm(event);
	if (!f)
		return panel({
			panel: 'edit',
			form: { ...emptyEdit(stockID), error: 'Invalid form submission.' }
		});

	// parseEditPositionRequest: the add-position parser, with the hidden symbol.
	const form: EditPositionFormVM = {
		id: stockID,
		symbol: formStr(f, 'symbol').toUpperCase(),
		category: formStr(f, 'category'),
		shares: formStr(f, 'shares'),
		buyPrice: formStr(f, 'buy_price'),
		buyDate: formStr(f, 'buy_date'),
		notes: formStr(f, 'notes'),
		range: normalizePortfolioTimeRange(String(f.get('range') ?? '')),
		error: ''
	};
	const parsed = parseAddPositionRequest(f);
	if (!parsed.req) return panel({ panel: 'edit', form: { ...form, error: parsed.error } });
	const req = { ...parsed.req, symbol: form.symbol };

	const res = await rawCall(event, 'PUT', `/v1/stocks/id/${stockID}`, req);
	if (res.status !== 200 || !res.body)
		return panel({ panel: 'edit', form: { ...form, error: updateStockErrorMessage(res) } });
	return redirectTo(portfolioRedirectURL(form.range));
}

function emptyEdit(id: string): EditPositionFormVM {
	return {
		id,
		symbol: '',
		category: '',
		shares: '',
		buyPrice: '',
		buyDate: '',
		notes: '',
		range: '',
		error: ''
	};
}

// DELETE /portfolio/positions/{id}

export async function deletePosition(event: RequestEvent, id: string): Promise<Response> {
	const stockID = parseUUID(id);
	if (!stockID) return text('Invalid position', { status: 400 });

	const res = await rawCall(event, 'DELETE', `/v1/stocks/id/${stockID}`);
	if (!res.networkError) {
		const reason = pilotManagedReason(res.status, res.body);
		if (reason) {
			// renderPositionEditRefusal: the edit panel again, carrying the reason.
			const loaded = await loadPositionForm(event, id);
			if (!loaded.ok) return text(loaded.message, { status: loaded.status });
			loaded.form.range = normalizePortfolioTimeRange(event.url.searchParams.get('range'));
			loaded.form.error = reason;
			return panel({ panel: 'edit', form: loaded.form });
		}
	}
	if (res.networkError || (res.status !== 204 && res.status !== 200)) {
		console.warn('delete stock failed', { stockID, status: res.status });
		return text('Could not delete this position.', { status: 502 });
	}
	return redirectTo(
		portfolioRedirectURL(normalizePortfolioTimeRange(event.url.searchParams.get('range')))
	);
}

// ---------------------------------------------------------------------------
// GET /portfolio/positions/{id}/sell

export async function sellForm(event: RequestEvent, id: string): Promise<Response> {
	const loaded = await loadPositionForm(event, id);
	if (!loaded.ok) return text(loaded.message, { status: loaded.status });
	const form: SellPositionFormVM = {
		id: loaded.stockID,
		symbol: loaded.form.symbol,
		maxShares: loaded.form.shares,
		shares: loaded.form.shares,
		sellPrice: loaded.form.buyPrice,
		sellDate: today(),
		range: normalizePortfolioTimeRange(event.url.searchParams.get('range')),
		error: ''
	};
	return panel({ panel: 'sell', form });
}

// POST /portfolio/positions/{id}/sell

export async function sellPosition(event: RequestEvent, id: string): Promise<Response> {
	const stockID = parseUUID(id);
	if (!stockID) return text('Invalid position', { status: 400 });
	const f = await readForm(event);
	const blank: SellPositionFormVM = {
		id: stockID,
		symbol: '',
		maxShares: '',
		shares: '',
		sellPrice: '',
		sellDate: '',
		range: '',
		error: ''
	};
	if (!f) return panel({ panel: 'sell', form: { ...blank, error: 'Invalid form submission.' } });

	// parseSellPositionRequest
	const form: SellPositionFormVM = {
		id: stockID,
		symbol: formStr(f, 'symbol').toUpperCase(),
		maxShares: formStr(f, 'max_shares'),
		shares: formStr(f, 'shares'),
		sellPrice: formStr(f, 'sell_price'),
		sellDate: formStr(f, 'sell_date'),
		range: normalizePortfolioTimeRange(String(f.get('range') ?? '')),
		error: ''
	};
	const fail = (error: string) => panel({ panel: 'sell', form: { ...form, error } });
	const shares = goParseFloat(form.shares);
	if (shares === null || !(shares > 0)) return fail('Enter a valid share amount.');
	const maxShares = goParseFloat(form.maxShares) ?? 0;
	if (maxShares > 0 && shares > maxShares) return fail('Cannot sell more shares than you hold.');
	const sellPrice = goParseFloat(form.sellPrice);
	if (sellPrice === null || !(sellPrice > 0)) return fail('Enter a valid sell price.');
	if (!validDate(form.sellDate)) return fail('Enter a valid sell date.');

	const res = await rawCall(event, 'POST', `/v1/stocks/id/${stockID}/sell`, {
		sharesToSell: shares,
		sellPrice,
		sellDate: form.sellDate
	});
	if (res.status !== 200 || !res.body) return fail(sellStockErrorMessage(res));
	return redirectTo(portfolioRedirectURL(form.range));
}

// ---------------------------------------------------------------------------
// GET /portfolio/positions/{id}/alert (requireTargetAlerts)

export async function alertForm(event: RequestEvent, id: string): Promise<Response> {
	const gate = await targetAlertsGate(event);
	if (gate.blocked) return gate.blocked;
	const loaded = await loadPositionForm(event, id);
	if (!loaded.ok) return text(loaded.message, { status: loaded.status });

	const form: PriceAlertFormVM = {
		stockID: loaded.stockID,
		symbol: loaded.form.symbol,
		targetID: '',
		targetPrice: '',
		direction: 'above',
		range: normalizePortfolioTimeRange(event.url.searchParams.get('range')),
		error: '',
		showProGate: !gate.pro
	};
	if (gate.pro) {
		const target = await lookupTargetForSymbol(event, loaded.form.symbol);
		if (target) {
			form.targetID = target.id.toLowerCase();
			form.targetPrice = formatFloat(target.targetPrice, 2);
			form.direction = targetAlertDirection(target.scenario);
		}
	}
	return panel({ panel: 'alert', form });
}

// POST /portfolio/positions/{id}/alert (requireTargetAlerts)

export async function saveAlert(event: RequestEvent, id: string): Promise<Response> {
	const gate = await targetAlertsGate(event);
	if (gate.blocked) return gate.blocked;
	if (!gate.pro) return text('Pro subscription required', { status: 403 });

	const loaded = await loadPositionForm(event, id);
	if (!loaded.ok) return text(loaded.message, { status: loaded.status });
	const symbol = loaded.form.symbol;
	const f = await readForm(event);
	if (!f) {
		return panel({
			panel: 'alert',
			form: {
				stockID: loaded.stockID,
				symbol,
				targetID: '',
				targetPrice: '',
				direction: '',
				range: '',
				error: 'Invalid form submission.',
				showProGate: false
			}
		});
	}

	// parsePriceAlertRequest
	const form: PriceAlertFormVM = {
		stockID: loaded.stockID,
		symbol: symbol.trim().toUpperCase(),
		targetID: formStr(f, 'target_id'),
		targetPrice: formStr(f, 'target_price'),
		direction: formStr(f, 'direction') === 'below' ? 'below' : 'above',
		range: normalizePortfolioTimeRange(String(f.get('range') ?? '')),
		error: '',
		showProGate: false
	};
	const price = goParseFloat(form.targetPrice);
	if (price === null || !(price > 0))
		return panel({ panel: 'alert', form: { ...form, error: 'Enter a target price above 0.' } });

	const existing = await lookupTargetForSymbol(event, symbol);
	if (existing) await rawCall(event, 'DELETE', `/v1/targets/${existing.id}`);

	const res = await rawCall(event, 'POST', '/v1/targets', {
		symbol: form.symbol,
		scenario: form.direction === 'below' ? 'bear' : 'base',
		lowPrice: price,
		highPrice: price,
		targetPrice: price,
		rationale: `Portfolio alert for ${form.symbol}`
	});
	if (res.status !== 201 || !res.body)
		return panel({ panel: 'alert', form: { ...form, error: createTargetErrorMessage(res) } });
	return redirectTo(portfolioRedirectURL(form.range));
}

// ---------------------------------------------------------------------------
// DELETE /portfolio/targets/{id} (requireTargetAlerts) — PortfolioTargetDelete,
// the price-alert panel's "Remove alert". Exported for the targets/[id]
// +server.ts, which the workspace area owns for PUT.

export async function deleteTargetAlert(event: RequestEvent, id: string): Promise<Response> {
	const gate = await targetAlertsGate(event);
	if (gate.blocked) return gate.blocked;
	if (!gate.pro) return text('Pro subscription required', { status: 403 });

	const targetID = parseUUID(id);
	if (!targetID) return text('Invalid alert', { status: 400 });
	const res = await rawCall(event, 'DELETE', `/v1/targets/${targetID}`);
	if (res.networkError || (res.status !== 204 && res.status !== 200))
		return text('Failed to remove alert', { status: 502 });
	// redirectPortfolio with the raw (un-normalized) range, as Go did.
	return redirectTo(portfolioRedirectURL(event.url.searchParams.get('range') ?? ''));
}
