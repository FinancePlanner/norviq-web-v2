import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import * as fmt from '#lib/format.js';
import { Path } from '#lib/nav.js';
import { getJSON } from '../fetch.server.js';
import { goFormat, parseTime } from '../shared.js';
import { headlineSource, headlineTimeAgo } from './headlines.js';
import type {
	EconomyPulseVM,
	MCPAgentRow,
	MCPStatusVM,
	SearchResultVM,
	TaxPanelVM,
	TerminalSummaryVM,
	WhyMovedVM
} from './types.js';

// Loaders for the dashboard's lazy panels. Each mirrors one Go fragment
// handler; the page streams them (Go: hx-trigger="load" shells).

type S = components['schemas'];

// ---------------------------------------------------------------------------
// Tax (command_center_tax.go)

const taxPanelOpportunityLimit = 4;

export function mapTaxPanel(resp: S['TaxDashboardResponse'] | null): TaxPanelVM {
	const vm: TaxPanelVM = {
		taxYear: '',
		harvestableLosses: '',
		estimatedBenefit: '',
		opportunities: [],
		href: Path.Tax,
		needsProfile: false,
		isStale: false,
		unavailable: false
	};
	if (!resp) {
		vm.unavailable = true;
		return vm;
	}
	vm.needsProfile = !resp.profileComplete;
	vm.isStale = resp.isStale;
	if (resp.taxYear) vm.taxYear = String(resp.taxYear);
	vm.harvestableLosses = fmt.formatCurrency(resp.summary?.harvestableLosses?.amount ?? 0);
	vm.estimatedBenefit = fmt.formatCurrency(resp.summary?.estimatedNetBenefit?.amount ?? 0);
	// Go compares against "open"; kept as-is (see docs/parity/dashboard.md).
	const open = (resp.opportunities ?? []).filter((o) => (o.status as string) === 'open');
	open.sort((a, b) => b.estimatedTaxBenefit.amount - a.estimatedTaxBenefit.amount);
	vm.opportunities = open.slice(0, taxPanelOpportunityLimit).map((o) => ({
		symbol: o.symbol,
		benefit: fmt.formatCurrency(o.estimatedTaxBenefit.amount),
		unrealizedLoss: fmt.formatCurrency(o.unrealizedLoss.amount)
	}));
	return vm;
}

export async function loadTaxPanel(event: RequestEvent): Promise<TaxPanelVM> {
	const res = await getJSON<S['TaxDashboardResponse']>(event, '/v1/tax/dashboard');
	return mapTaxPanel(res.failed ? null : res.data);
}

// ---------------------------------------------------------------------------
// MCP status (dashboard_mcp_status.go)

interface PersonalAccessToken {
	id: string;
	name: string;
	scopes: string[] | null;
	lastUsedAt?: string | null;
}

function scopeFamily(scope: string): string {
	const s = scope.trim().toLowerCase();
	if (s.startsWith('expenses:')) return 'expenses';
	if (s.startsWith('reports:')) return 'reports';
	if (s.startsWith('market:') || s.startsWith('insights:')) return 'market';
	if (s.startsWith('tax:')) return 'tax';
	return '';
}

function scopeState(live: Set<string>, ready: Set<string>, fam: string): string {
	if (live.has(fam)) return 'live';
	if (ready.has(fam)) return 'ready';
	return 'off';
}

/** dashboard_mcp_status.go formatRelativeTime. */
export function formatRelativeTime(t: Date, now: Date): string {
	const d = Math.max(0, now.getTime() - t.getTime());
	const s = 1000;
	const m = 60 * s;
	const h = 60 * m;
	if (d < 45 * s) return 'Just now';
	if (d < 90 * s) return '1 min ago';
	if (d < 45 * m) return `${Math.floor(d / m)} min ago`;
	if (d < 90 * m) return '1 hour ago';
	if (d < 36 * h) return `${Math.floor(d / h)} hours ago`;
	if (d < 60 * h) return '1 day ago';
	if (d < 14 * 24 * h) return `${Math.floor(d / (24 * h))} days ago`;
	return goFormat(t, 'Jan 2, 2006');
}

export async function loadMCPStatus(event: RequestEvent, isPro: boolean, now = new Date()): Promise<MCPStatusVM> {
	const vm: MCPStatusVM = {
		isPro,
		hasTokens: false,
		tokenCount: 0,
		liveCount: 0,
		lastActivity: '',
		agenticLabel: 'Agentic status · Standby',
		scopes: [
			{ label: 'Expense tools', state: 'off' },
			{ label: 'Reports / spend', state: 'off' },
			{ label: 'Market / insights', state: 'off' },
			{ label: 'Tax dashboard', state: 'off' }
		],
		agents: [],
		loadError: false,
		needsPro: false,
		empty: false
	};
	if (!isPro) {
		vm.needsPro = true;
		vm.empty = true;
		return vm;
	}
	let tokens: PersonalAccessToken[];
	try {
		tokens = (await apiJSON<{ items?: PersonalAccessToken[] }>(event, 'GET', '/v1/tokens'))?.items ?? [];
	} catch (err) {
		console.warn('list PAT for mcp status failed', err);
		vm.loadError = true;
		return vm;
	}
	if (tokens.length === 0) {
		vm.empty = true;
		return vm;
	}
	const liveWindow = 24 * 60 * 60 * 1000;
	const scopeLive = new Set<string>();
	const scopeReady = new Set<string>();
	let newest: Date | null = null;
	for (const t of tokens) {
		vm.hasTokens = true;
		vm.tokenCount++;
		const agent: MCPAgentRow = {
			name: (t.name ?? '').trim() || 'Unnamed token',
			scopes: (t.scopes ?? []).join(', '),
			lastUsed: 'Never',
			status: 'Never',
			isLive: false
		};
		let isLive = false;
		const lastUsed = parseTime(t.lastUsedAt);
		if (lastUsed) {
			agent.lastUsed = formatRelativeTime(lastUsed, now);
			if (now.getTime() - lastUsed.getTime() <= liveWindow) {
				isLive = true;
				agent.status = 'Live';
				agent.isLive = true;
				vm.liveCount++;
			} else {
				agent.status = 'Idle';
			}
			if (!newest || lastUsed > newest) newest = lastUsed;
		}
		for (const scope of t.scopes ?? []) {
			const fam = scopeFamily(scope);
			if (!fam) continue;
			(isLive ? scopeLive : scopeReady).add(fam);
		}
		vm.agents.push(agent);
	}
	vm.agents.sort((a, b) => {
		if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
		const an = a.name.toLowerCase();
		const bn = b.name.toLowerCase();
		return an < bn ? -1 : an > bn ? 1 : 0;
	});
	vm.scopes = [
		{ label: 'Expense tools', state: scopeState(scopeLive, scopeReady, 'expenses') },
		{ label: 'Reports / spend', state: scopeState(scopeLive, scopeReady, 'reports') },
		{ label: 'Market / insights', state: scopeState(scopeLive, scopeReady, 'market') },
		{ label: 'Tax dashboard', state: scopeState(scopeLive, scopeReady, 'tax') }
	];
	if (newest) vm.lastActivity = formatRelativeTime(newest, now);
	if (vm.liveCount > 0) vm.agenticLabel = 'Agentic status · Live';
	else if (vm.hasTokens) vm.agenticLabel = 'Agentic status · Ready';
	return vm;
}

// ---------------------------------------------------------------------------
// Why moved (dashboard_why_moved.go)

const signedFixed = (v: number, prec: number) => `${v >= 0 ? '+' : ''}${fmt.formatFloat(v, prec)}`;

function humanizeSince(elapsedMs: number): string {
	const m = 60_000;
	const h = 60 * m;
	if (elapsedMs < h) return `${Math.trunc(elapsedMs / m)}m ago`;
	if (elapsedMs < 24 * h) return `${Math.trunc(elapsedMs / h)}h ago`;
	return `${Math.trunc(elapsedMs / (24 * h))}d ago`;
}

function formatSentimentSource(src: S['WhyMovedSentimentSource']): string {
	const line = `${src.postsAnalyzed} X posts across ${src.symbolsCovered} holdings`;
	const posted = src.lastPostAt ? parseTime(src.lastPostAt) : null;
	if (!posted) return line;
	return line + ' · newest ' + humanizeSince(Date.now() - posted.getTime());
}

/** null = render nothing (Go wrote an empty 200 so the shell collapsed). */
export async function loadWhyMoved(event: RequestEvent, isPro: boolean): Promise<WhyMovedVM | null> {
	const res = await getJSON<S['WhyMovedResponse']>(event, '/v1/dashboard/why-moved');
	if (res.failed || !res.data) return null;
	const data = res.data;
	const vm: WhyMovedVM = {
		aiSummary: data.aiSummary?.text ?? '',
		moverChips: [],
		indexChips: [],
		changeLabel: data.portfolioChangePercent != null ? `${signedFixed(data.portfolioChangePercent, 2)}% today` : '',
		isPro,
		sourceLine: '',
		capacityLine: ''
	};
	for (const mover of data.movers ?? []) {
		vm.moverChips.push({
			symbol: mover.symbol,
			changePct: mover.changePercent,
			change: `${signedFixed(mover.changePercent, 2)}%`,
			sentimentLabel: mover.sentiment?.label ?? '',
			postCount: mover.sentiment?.postCount ?? 0
		});
	}
	for (const index of data.context?.indices ?? []) {
		vm.indexChips.push({ label: index.label, changePct: index.changePercent, change: `${signedFixed(index.changePercent, 2)}%` });
	}
	if (data.sentimentSource && data.sentimentSource.postsAnalyzed > 0) vm.sourceLine = formatSentimentSource(data.sentimentSource);
	try {
		const cap = await apiJSON<S['SpendToUnitsCapacity']>(event, 'GET', '/v1/budget/dca-capacity');
		if (cap && cap.surplusUnits != null) {
			vm.capacityLine = `Leftover ${cap.currencyCode || 'EUR'} ${fmt.formatFloat(cap.surplusAmount, 0)} → ${fmt.formatFloat(cap.surplusUnits, 2)} ${cap.symbol}. Equivalent at last price — not an order.`;
		}
	} catch {
		/* best effort, as in Go */
	}
	if (!vm.aiSummary && vm.moverChips.length === 0) return null;
	return vm;
}

// ---------------------------------------------------------------------------
// Terminal summary (dashboard_terminal.go + terminal_map.go terminalRowVM)

const terminalTopRows = 3;
export const terminalDisclaimer = 'Terminal prices are your assumptions, not forecasts. Not financial advice.';

export async function loadTerminalSummary(event: RequestEvent): Promise<TerminalSummaryVM> {
	const vm: TerminalSummaryVM = {
		loadError: false,
		empty: false,
		totalValueWanted: '',
		monthlyAutobuyTotal: '',
		top: [],
		disclaimer: event.locals.t(terminalDisclaimer)
	};
	const res = await getJSON<S['TerminalPositionsSummaryResponse']>(event, '/v1/terminal-positions/summary');
	const summary = res.data;
	if (res.failed || !summary) {
		if (!res.failed) console.warn('terminal summary', res.status);
		vm.loadError = true;
		return vm;
	}
	vm.monthlyAutobuyTotal = fmt.currency(summary.monthlyAutobuyTotal, summary.currency);
	if (summary.positionCount === 0) {
		vm.empty = true;
		if (summary.monthlyAutobuyTotal <= 0) vm.monthlyAutobuyTotal = '';
		return vm;
	}
	vm.totalValueWanted = fmt.compactCurrency(summary.totalValueWanted, summary.currency);
	for (const p of (summary.topPositions ?? []).slice(0, terminalTopRows)) {
		const computed =
			!p.scenarioError &&
			p.terminalSharePrice != null &&
			p.sharesNeeded != null &&
			p.progress != null &&
			p.sharesStillNeeded != null &&
			p.gapValueAtTerminal != null;
		if (!computed) {
			vm.top.push({ ticker: p.ticker, terminalSharePrice: fmt.DASH, sharesNeeded: fmt.DASH, progressLabel: fmt.DASH, progressPct: 0 });
			continue;
		}
		const pct = p.progress! * 100;
		vm.top.push({
			ticker: p.ticker,
			terminalSharePrice: fmt.currency(p.terminalSharePrice!, summary.currency),
			sharesNeeded: fmt.number(p.sharesNeeded!, 2),
			progressLabel: fmt.percent(p.progress!),
			progressPct: Number.isNaN(pct) || pct < 0 ? 0 : Math.min(pct, 100)
		});
	}
	return vm;
}

// ---------------------------------------------------------------------------
// Economy pulse (market_headlines.go LoadMarketHeadlines)

export async function loadEconomyPulse(event: RequestEvent, limit = 4): Promise<EconomyPulseVM> {
	const res = await getJSON<S['StockNews'][]>(event, '/v1/market/news/general', { limit });
	if (res.failed || !res.data) {
		console.warn('load economy pulse', res.status);
		return { items: null };
	}
	const now = new Date();
	const items = res.data
		.filter((a) => (a.title ?? '').trim() !== '' && a.url)
		.map((a) => ({ title: a.title.trim(), url: a.url, source: headlineSource(a.url), timeAgo: headlineTimeAgo(a.date, now) }));
	return { items };
}

// ---------------------------------------------------------------------------
// Asset search (dashboard_data.go LoadAssetSearchResults)

function formatOptionalSignedPercent(value: number | null | undefined): [string, string] {
	if (value == null) return ['—', ''];
	return [fmt.formatSignedPercent(value), fmt.changeClass(value)];
}

export async function loadAssetSearchResults(event: RequestEvent, rawQuery: string, includeReturns: boolean): Promise<SearchResultVM[]> {
	const query = rawQuery.trim();
	if (query.length < 1) return [];
	const res = await getJSON<{ symbol: string; name: string; exchange: string }[]>(event, '/v1/assets/search', { q: query, limit: 8 });
	if (res.failed || !res.data) return [];
	const out: SearchResultVM[] = [];
	for (const row of res.data) {
		const symbol = (row.symbol ?? '').trim();
		if (!symbol) continue;
		out.push({
			symbol,
			name: (row.name ?? '').trim(),
			exchange: (row.exchange ?? '').trim(),
			href: '/portfolio/' + symbol.toLowerCase(),
			return3M: '',
			return3MClass: '',
			return6M: '',
			return6MClass: '',
			returnYTD: '',
			returnYTDClass: ''
		});
	}
	if (includeReturns && out.length > 0) {
		const batch = await getJSON<S['StockPeriodReturnsBatchResponse']>(event, '/v1/market/returns/batch', {
			symbols: out.map((r) => r.symbol).join(',')
		});
		if (batch.failed) console.warn('asset search period returns fetch failed');
		const bySymbol = new Map((batch.data?.returns ?? []).map((r) => [r.symbol.trim().toUpperCase(), r]));
		for (const row of out) {
			const item = bySymbol.get(row.symbol.toUpperCase());
			if (!item) continue;
			[row.return3M, row.return3MClass] = formatOptionalSignedPercent(item.threeMonth);
			[row.return6M, row.return6MClass] = formatOptionalSignedPercent(item.sixMonth);
			[row.returnYTD, row.returnYTDClass] = formatOptionalSignedPercent(item.yearToDate);
		}
	}
	return out;
}
