import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import type { PillarSlice } from '#lib/charts/index.js';
import { formatCurrency, formatFloat } from '#lib/format.js';
import { Path } from '#lib/nav.js';
import * as timerange from '#lib/timerange.js';
import { fetchJSON, getJSON } from '../fetch.server.js';
import { clampPercent, goFormat, isoDate, parseTime, relativeTimeSince } from '../shared.js';
import { resolvePillar, resolvePillars } from '../pillars.js';
import { mapActivities, mapRecentSpend } from '../activity/mappers.js';
import { focusPointsTeaser, mapFinancialHealth, mapFocusPoints, mapInsightCards } from '../insights/mappers.js';
import type { HealthMetricsVM } from '../types.js';
import type {
	ActionItemVM,
	ActionQueueVM,
	CommandCenterViewModel,
	HeatmapData,
	LedgerDayVM,
	LedgerFilterVM,
	LedgerVM,
	OverviewViewModel,
	RangeOptionVM,
	SeriesData
} from './types.js';

// Port of norviq-web internal/handlers/command_center_data.go and the
// overview half of dashboard_data.go (LoadOverviewViewModel).

type S = components['schemas'];
type Activity = S['UserActivityResponse'];
type InboxItem = S['NotificationInboxItem'];
type Expense = S['ExpenseResponse'];

const overviewActivityLimit = 5;
const actionQueueLimit = 12;
const ledgerActivityLimit = 200;
const inboxPageLimit = 50;
const inboxMaxPages = 3;

// ---------------------------------------------------------------------------
// Overview (LoadOverviewViewModel)

export function greetingForTime(now: Date, timeZone = 'UTC'): string {
	const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(now)) % 24;
	if (hour >= 5 && hour < 12) return 'Good morning';
	if (hour >= 12 && hour < 17) return 'Good afternoon';
	if (hour >= 17 && hour < 22) return 'Good evening';
	return 'Good night';
}

type Change = S['PortfolioChange'];

/** portfolio_change.go changeSuffix. */
function changeSuffix(change: Change | undefined | null): string {
	if (!change) return '';
	switch (change.basis) {
		case 'previousTradingDay':
			return 'vs previous close';
		case 'week':
			return 'vs last week';
		case 'month':
			return 'vs last month';
		case 'ytd':
			return 'year to date';
		case 'inception':
			return 'since you started';
		default: {
			const d = parseTime(change.fromDate);
			return 'since ' + (d ? goFormat(d, '2 Jan 2006') : change.fromDate);
		}
	}
}

/** portfolio_change.go formatChange. */
function formatChange(change: Change | undefined | null): { metric: string; suffix: string; positive: boolean } | null {
	if (!change) return null;
	const positive = change.percent >= 0;
	return { metric: `${positive ? '+' : ''}${formatFloat(change.percent * 100, 1)}%`, suffix: changeSuffix(change), positive };
}

function formatChangeLabel(change: Change | undefined | null): { label: string; positive: boolean } | null {
	const c = formatChange(change);
	if (!c) return null;
	return { label: c.suffix ? `${c.metric} ${c.suffix}` : c.metric, positive: c.positive };
}

function primaryChange(changes: S['PortfolioChanges'] | undefined): Change | null {
	if (!changes) return null;
	return changes.day ?? changes.week ?? changes.month ?? changes.sinceInception ?? null;
}

function performancePointSeries(points: S['PerformancePoint'][]): SeriesData {
	const dates = points.map((p) => parseTime(p.date) ?? new Date(0));
	const years = dates.map((d) => d.getUTCFullYear());
	const layout = Math.max(...years) > Math.min(...years) ? "Jan 2, '06" : 'Jan 2';
	return { labels: dates.map((d) => goFormat(d, layout)), values: points.map((p) => p.value) };
}

function monthOverMonthChange(values: number[]): { pct: number; positive: boolean } | null {
	if (values.length < 2) return null;
	const prev = values[values.length - 2];
	const last = values[values.length - 1];
	if (prev <= 0) return null;
	const pct = (last - prev) / prev;
	return { pct, positive: pct >= 0 };
}

function spendingSeries(summaries: S['BudgetMonthSummaryResponse'][] | undefined): SeriesData {
	if (!summaries?.length) return { labels: [], values: [] };
	const sorted = [...summaries].sort((a, b) => (parseTime(a.monthStart)?.getTime() ?? 0) - (parseTime(b.monthStart)?.getTime() ?? 0));
	const window = sorted.slice(Math.max(0, sorted.length - 12));
	return {
		labels: window.map((r) => goFormat(parseTime(r.monthStart) ?? new Date(0), 'Jan')),
		values: window.map((r) => Math.max(0, r.actual))
	};
}

function mapHealthMetrics(insights: S['DashboardInsightsResponse'] | null, reports: S['ReportsOverviewResponse'] | null): HealthMetricsVM {
	const vm: HealthMetricsVM = {
		savingsRate: '-',
		savingsRatePct: 0,
		spendingStatus: '-',
		spendingOnTrack: false,
		budgetRemaining: '-',
		budgetRemainingPct: 0,
		healthScore: '-/100',
		healthScorePct: 0,
		streakDays: 0,
		unavailable: insights === null && reports === null
	};
	if (insights) {
		vm.savingsRate = `${formatFloat(insights.savingsRate, 0)}%`;
		vm.savingsRatePct = clampPercent(insights.savingsRate);
		vm.healthScore = `${insights.financialHealth.score}/100`;
		vm.healthScorePct = clampPercent(insights.financialHealth.score);
		vm.streakDays = insights.budgetStreak;
	}
	const summary = reports?.latestMonthSummary;
	if (summary) {
		const remaining = Math.max(0, summary.planned - summary.actual);
		vm.budgetRemaining = formatCurrency(remaining) + ' left';
		if (summary.planned > 0) vm.budgetRemainingPct = clampPercent((remaining / summary.planned) * 100);
		vm.spendingOnTrack = summary.actual <= summary.planned;
		vm.spendingStatus = vm.spendingOnTrack ? 'On track' : 'Over budget';
	} else if (insights && insights.budgetStreak > 0) {
		vm.spendingStatus = `${insights.budgetStreak} day streak`;
		vm.spendingOnTrack = true;
	}
	return vm;
}

export async function loadOverviewViewModel(event: RequestEvent, username: string, now = new Date()): Promise<OverviewViewModel> {
	const vm: OverviewViewModel = {
		greeting: greetingForTime(now),
		username,
		totalWealth: '',
		ytdPercent: '',
		ytdPositive: false,
		portfolioPeriodPercent: '',
		portfolioPeriodSuffix: '',
		portfolioPeriodPositive: false,
		wealthChart: null,
		spendingThisMonth: '',
		spendingPeriodPercent: '',
		spendingPeriodPositive: false,
		spendingChart: null,
		activities: [],
		recentSpend: [],
		financialHealth: mapFinancialHealth(null),
		healthMetrics: mapHealthMetrics(null, null),
		insightCards: [],
		focusPoints: [],
		goalsError: false,
		loadErrors: {}
	};

	const [dash, insights, performance, activities, reports, expenses, goals] = await Promise.all([
		getJSON<S['DashboardResponse']>(event, '/v1/dashboard'),
		getJSON<S['DashboardInsightsResponse']>(event, '/v1/dashboard/insights'),
		getJSON<S['PortfolioPerformanceResponse']>(event, '/v1/portfolio/performance'),
		getJSON<Activity[]>(event, '/v1/activities', { limit: overviewActivityLimit }),
		getJSON<S['ReportsOverviewResponse']>(event, '/v1/reports/overview'),
		getJSON<Expense[]>(event, '/v1/expenses'),
		getJSON<S['GoalResponse'][]>(event, '/v1/goals')
	]);
	if (dash.failed) vm.loadErrors.dashboard = true;
	if (insights.failed) vm.loadErrors.insights = true;
	if (performance.failed) vm.loadErrors.performance = true;
	if (activities.failed) vm.loadErrors.activities = true;
	if (reports.failed) vm.loadErrors.reports = true;
	if (expenses.failed) vm.loadErrors.expenses = true;
	if (goals.failed) vm.goalsError = true;

	let totalValue = dash.data?.portfolio?.totalMarketValue ?? 0;
	if (totalValue <= 0 && reports.data) totalValue = reports.data.portfolioStatistics?.totalMarketValue ?? 0;
	vm.totalWealth = formatCurrency(totalValue);

	const perf = performance.data;
	if (perf) {
		if (perf.changes) {
			const ytd = formatChangeLabel(perf.changes.ytd);
			if (ytd) {
				vm.ytdPercent = ytd.label;
				vm.ytdPositive = ytd.positive;
			}
			const change = primaryChange(perf.changes);
			if (change) {
				const label = formatChangeLabel(change)!;
				vm.portfolioPeriodPercent = label.label;
				vm.portfolioPeriodSuffix = changeSuffix(change);
				vm.portfolioPeriodPositive = label.positive;
			}
		}
		if (perf.points?.length) {
			const series = performancePointSeries(perf.points);
			if (series.values.length > 0) vm.wealthChart = series;
		}
	}

	vm.activities = mapActivities(activities.data ?? [], now);
	vm.recentSpend = mapRecentSpend(expenses.data ?? []);
	if (insights.data) {
		vm.financialHealth = mapFinancialHealth(insights.data.financialHealth);
		vm.insightCards = mapInsightCards(insights.data);
	}
	vm.healthMetrics = mapHealthMetrics(insights.data, reports.data);
	vm.focusPoints = focusPointsTeaser(mapFocusPoints(goals.data ?? []));

	if (reports.data) {
		if (reports.data.latestMonthSummary) vm.spendingThisMonth = formatCurrency(reports.data.latestMonthSummary.actual);
		const series = spendingSeries(reports.data.monthlySummaries);
		if (series.labels.length > 0) {
			const change = monthOverMonthChange(series.values);
			if (change) {
				vm.spendingPeriodPositive = change.positive;
				vm.spendingPeriodPercent = `${change.positive ? '+' : ''}${formatFloat(change.pct * 100, 1)}% vs last month`;
			}
			vm.spendingChart = series;
		}
	}
	return vm;
}

// ---------------------------------------------------------------------------
// Ledger

const ledgerDomains = [
	{ key: 'all', label: 'Everything' },
	{ key: 'portfolio', label: 'Portfolio' },
	{ key: 'spending', label: 'Spending' }
];

export function parseLedgerDomain(raw: string | null | undefined): string {
	const domain = (raw ?? '').trim().toLowerCase();
	return ledgerDomains.some((d) => d.key === domain) ? domain : 'all';
}

function activityDomain(type: Activity['type']): string {
	switch (type) {
		case 'stock_added':
		case 'stock_updated':
			return 'portfolio';
		case 'expense_recorded':
		case 'expense_updated':
			return 'spending';
		default:
			return 'other';
	}
}

function exactTicker(title: string): string {
	const candidate = title.trim();
	if (candidate.length < 1 || candidate.length > 5) return '';
	return /^[A-Z0-9]+$/.test(candidate) ? candidate : '';
}

function activityHref(type: Activity['type'], title: string): string {
	switch (type) {
		case 'stock_added':
		case 'stock_updated': {
			const ticker = exactTicker(title);
			return ticker ? `${Path.Portfolio}/${ticker}` : Path.Portfolio;
		}
		case 'expense_recorded':
		case 'expense_updated':
			return Path.Expenses;
		default:
			return '';
	}
}

function filterActivitiesByDomain(activities: Activity[], domain: string): Activity[] {
	const d = domain.trim().toLowerCase();
	if (d === '' || d === 'all' || !ledgerDomains.some((x) => x.key === d)) return activities;
	return activities.filter((a) => activityDomain(a.type) === d);
}

function buildRangeOptions(active: timerange.Key, domain: string): RangeOptionVM[] {
	return timerange.all().map((k) => {
		let href = `${Path.Dashboard}/pulse?range=${k}`;
		const d = parseLedgerDomain(domain);
		if (d !== 'all') href += `&domain=${d}`;
		return { key: k, label: timerange.label(k), href, active: k === active };
	});
}

function buildLedgerFilters(rng: timerange.Key, active: string): LedgerFilterVM[] {
	const a = parseLedgerDomain(active);
	return ledgerDomains.map((d) => ({
		key: d.key,
		label: d.label,
		href: `${Path.Dashboard}/ledger?range=${rng}&domain=${d.key}`,
		active: d.key === a
	}));
}

const createdAt = (a: Activity) => parseTime(a.createdAt) ?? new Date(0);

function buildLedger(activities: Activity[], rng: timerange.Key, now: Date): LedgerDayVM[] {
	const { from, to } = timerange.window(rng, now);
	const inWindow = timerange.bucket(activities, createdAt, from, to);
	if (inWindow.length === 0) return [];
	return timerange.groupByDayRelativeTo(inWindow, createdAt, now).map((g) => {
		const items = mapActivities(g.items, now).map((item, i) => ({
			...item,
			href: activityHref(g.items[i].type, g.items[i].title),
			domain: activityDomain(g.items[i].type)
		}));
		return { label: g.label, items };
	});
}

function emptyLedger(rng: timerange.Key, domain: string): LedgerVM {
	const d = parseLedgerDomain(domain);
	return {
		range: rng,
		rangeLabel: timerange.label(rng),
		domain: d,
		ledgerFilters: buildLedgerFilters(rng, d),
		ledger: [],
		loadError: false
	};
}

/** LoadLedgerViewModel: only the LEDGER rail. */
export async function loadLedgerViewModel(event: RequestEvent, rng: timerange.Key, domain: string, now = new Date()): Promise<LedgerVM> {
	const vm = emptyLedger(rng, domain);
	const res = await getJSON<Activity[]>(event, '/v1/activities', { limit: ledgerActivityLimit });
	if (res.failed) {
		vm.loadError = true;
		return vm;
	}
	if (!res.data) return vm;
	vm.ledger = buildLedger(filterActivitiesByDomain(res.data, vm.domain), rng, now);
	return vm;
}

// ---------------------------------------------------------------------------
// Action queue

/** drainNotificationInbox: pages the unread inbox up to inboxMaxPages. */
async function drainNotificationInbox(event: RequestEvent): Promise<{ items: InboxItem[]; unread: number } | null> {
	const items: InboxItem[] = [];
	let unread = 0;
	let cursor: string | undefined;
	for (let page = 0; page < inboxMaxPages; page++) {
		const res = await getJSON<S['NotificationInboxPage']>(event, '/v1/notifications/inbox', {
			unread: true,
			limit: inboxPageLimit,
			cursor
		});
		if (res.failed) {
			if (page === 0) return null;
			console.warn('notification inbox drain stopped early', page);
			break;
		}
		if (!res.data) break;
		items.push(...(res.data.items ?? []));
		unread = res.data.unreadCount;
		if (!res.data.nextCursor) break;
		cursor = res.data.nextCursor;
	}
	return { items, unread };
}

function notificationPriority(kind: string): number {
	return ({ price_target: 0, rebalancing: 1, budget: 2, tax: 3, earnings: 4, watchlist_screen: 5 } as Record<string, number>)[kind] ?? 6;
}

function notificationKindLabel(kind: string): string {
	return (
		({ price_target: 'Price target', rebalancing: 'Rebalancing', budget: 'Budget', tax: 'Tax', earnings: 'Earnings', watchlist_screen: 'Screen' } as Record<string, string>)[kind] ??
		'Alert'
	);
}

function notificationTone(kind: string): string {
	if (kind === 'price_target' || kind === 'rebalancing') return 'critical';
	if (kind === 'budget' || kind === 'tax') return 'warning';
	return 'info';
}

function notificationFallbackHref(kind: string): string {
	switch (kind) {
		case 'price_target':
			return Path.Portfolio + '/targets';
		case 'rebalancing':
			return Path.Portfolio + '/rebalancing';
		case 'budget':
			return Path.Expenses;
		case 'tax':
			return Path.Tax;
		case 'earnings':
			return Path.Portfolio + '/earnings';
		case 'watchlist_screen':
			return Path.Portfolio + '/screens';
		default:
			return Path.Dashboard;
	}
}

const isInAppPath = (raw: string) => raw.startsWith('/') && !raw.startsWith('//');

function notificationHref(item: InboxItem): string {
	const link = (item.deepLink ?? '').trim();
	if (link && isInAppPath(link)) return link;
	return notificationFallbackHref(item.kind);
}

/** parseNotificationTime: RFC 3339 or a zone-less ISO stamp (read as UTC, like Go); null otherwise. */
function parseNotificationTime(raw: string): Date | null {
	const s = (raw ?? '').trim();
	if (!s) return null;
	const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s) ? s + 'Z' : s;
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(iso)) return null;
	return parseTime(iso);
}

export function buildActionQueue(items: InboxItem[], now: Date): ActionItemVM[] {
	const entries = items
		.filter((item) => !(item.readAt && item.readAt.trim() !== ''))
		.map((item) => {
			const at = parseNotificationTime(item.createdAt);
			return {
				vm: {
					id: item.id,
					kind: item.kind,
					kindLabel: notificationKindLabel(item.kind),
					title: item.title,
					body: item.body,
					tone: notificationTone(item.kind),
					href: notificationHref(item),
					readHref: `${Path.Dashboard}/action/${item.id}/read`,
					relativeTime: at ? relativeTimeSince(at, now) : ''
				} satisfies ActionItemVM,
				priority: notificationPriority(item.kind),
				at: at?.getTime() ?? Number.NEGATIVE_INFINITY
			};
		});
	entries.sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : b.at - a.at));
	return entries.slice(0, actionQueueLimit).map((e) => e.vm);
}

/** LoadActionQueueViewModel: only the NOW rail. */
export async function loadActionQueueViewModel(event: RequestEvent, now = new Date()): Promise<ActionQueueVM> {
	const drained = await drainNotificationInbox(event);
	if (!drained) return { actionQueue: [], unreadCount: 0, loadError: true };
	return { actionQueue: buildActionQueue(drained.items, now), unreadCount: drained.unread, loadError: false };
}

/** DashboardActionRead: mark one item read; the queue re-renders either way. */
export async function markActionRead(event: RequestEvent, id: string): Promise<void> {
	const res = await fetchJSON(event, 'PUT', `/v1/notifications/inbox/${encodeURIComponent(id)}/read`, { read: true });
	if (res.failed) console.warn('mark notification read failed', id);
}

// ---------------------------------------------------------------------------
// Pulse charts

function buildPillarSlices(expenses: Expense[]): PillarSlice[] {
	if (expenses.length === 0) return [];
	const totals = new Map<string, number>();
	for (const e of expenses) {
		if (e.amount <= 0) continue;
		const def = resolvePillar(e.pillar);
		totals.set(def.key, (totals.get(def.key) ?? 0) + e.amount);
	}
	return resolvePillars(...totals.keys())
		.filter((def) => (totals.get(def.key) ?? 0) > 0)
		.map((def) => ({ name: def.label, value: totals.get(def.key)!, colorVar: def.colorVar }));
}

function rangeSupportsHeatmap(rng: timerange.Key): boolean {
	return rng === timerange.Last30d || rng === timerange.Last12mo || rng === timerange.YTD;
}

// ---------------------------------------------------------------------------
// Command center (LoadCommandCenterViewModel)

export async function loadCommandCenterViewModel(
	event: RequestEvent,
	username: string,
	rng: timerange.Key,
	rawDomain: string,
	now = new Date()
): Promise<CommandCenterViewModel> {
	const domain = parseLedgerDomain(rawDomain);
	const { from, to } = timerange.window(rng, now);
	const dayMs = 24 * 60 * 60 * 1000;

	const [expenses, overview, activities, drained] = await Promise.all([
		getJSON<Expense[]>(event, '/v1/expenses', { from: isoDate(from), to: isoDate(new Date(to.getTime() - dayMs)) }),
		loadOverviewViewModel(event, username, now),
		getJSON<Activity[]>(event, '/v1/activities', { limit: ledgerActivityLimit }),
		drainNotificationInbox(event)
	]);

	const loadErrors: Record<string, boolean> = {};
	if (expenses.failed) loadErrors.pillars = true;
	if (activities.failed) loadErrors.ledger = true;
	if (!drained) loadErrors.actions = true;

	const ledger = emptyLedger(rng, domain);
	ledger.loadError = !!loadErrors.ledger;
	ledger.ledger = buildLedger(filterActivitiesByDomain(activities.data ?? [], domain), rng, now);

	const slices = buildPillarSlices(expenses.data ?? []);

	let heatmap: HeatmapData | null = null;
	if (rangeSupportsHeatmap(rng)) {
		const windowed = timerange.bucket(activities.data ?? [], createdAt, from, to);
		if (windowed.length > 0) {
			const counts: Record<string, number> = {};
			for (const a of windowed) {
				const key = isoDate(createdAt(a));
				counts[key] = (counts[key] ?? 0) + 1;
			}
			// to is exclusive, so the calendar's last drawn day is to-1.
			heatmap = { from: isoDate(from), to: isoDate(new Date(to.getTime() - dayMs)), counts };
		}
	}

	for (const [key, failed] of Object.entries(overview.loadErrors)) if (failed) loadErrors[key] = true;

	return {
		overview,
		range: rng,
		rangeLabel: timerange.label(rng),
		rangeOptions: buildRangeOptions(rng, domain),
		queue: {
			actionQueue: drained ? buildActionQueue(drained.items, now) : [],
			unreadCount: drained?.unread ?? 0,
			loadError: !drained
		},
		ledger,
		pillarSlices: slices.length > 0 ? slices : null,
		heatmap,
		domain,
		loadErrors
	};
}
