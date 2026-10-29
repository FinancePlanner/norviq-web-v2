// Port of the view-model builders in norviq-web internal/handlers/{pilots,
// pilot_detail,pilot_follow_form,pilot_follows}.go and the constants in
// internal/pages/pilots/shared.go. Pure functions, no I/O.
import { formatCurrency, formatFloat } from '#lib/format.js';
import { apiErrorMessage } from '../api-errors.js';
import type {
	BillingUpgradeRequiredResponse,
	DisclosureRowVM,
	DetailVM,
	EventRowVM,
	FollowDetailVM,
	FollowFormVM,
	FollowRowVM,
	PilotCardVM,
	PilotDetail,
	PilotDisclosureItem,
	PilotFollowCreateRequest,
	PilotFollowEventResponse,
	PilotFollowResponse,
	PilotFollowSnapshotResponse,
	PilotSummary
} from './types.js';

/** The exact label for a pilot whose book is empty. Such a pilot can never be followed. */
export const NO_TRADES_YET = 'No trades seen yet';

/** Shown on every surface where a follow can start or be watched. */
export const DISCLAIMER =
	'Simulated. No real money is invested and no orders are placed. ' +
	'Trades come from public disclosures, which arrive late: up to 45 days after the trade for members of Congress, ' +
	'and up to 135 days for 13F funds. Each trade is priced when Norviq sees the disclosure, not on the day the pilot traded.';

/** The follow form's "target" values. An existing watchlist is the prefix plus its ID. */
export const TARGET_PORTFOLIO = 'portfolio';
export const TARGET_NEW_WATCHLIST = 'watchlist:new';
export const TARGET_WATCHLIST_PREFIX = 'watchlist:';

/** Mirrors PilotFollowService.maxStartingCapital. */
const MAX_PILOT_STARTING_CAPITAL = 10_000_000;
export const DEFAULT_PILOT_STARTING_CAPITAL = '10000';
/** Mirrors PilotFollowService.proFollowLimit. */
const PILOT_PRO_FOLLOW_LIMIT = 10;

const PILOT_CAPITAL_COPY = 'Enter a starting capital above $0 and up to $10,000,000.';
const PILOT_CHOOSE_TARGET_COPY = 'Choose where the copied trades should go.';

export const PILOT_FOLLOW_UPDATE_FAILED_COPY = 'Could not update this follow. Try again shortly.';
export const PILOT_FOLLOW_STOP_FAILED_COPY = 'Could not stop following. Try again shortly.';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/** uuid.Parse acceptance (hyphenated or bare 32 hex, optional braces / urn prefix are rare enough to skip). */
export function isUUID(raw: string): boolean {
	return UUID_RE.test(raw.trim());
}

const pathEscape = (s: string) => encodeURIComponent(s);

/** uuid.UUID.String(): canonical lower-case hyphenated form (the backend sends upper case). */
export function uuidString(raw: string): string {
	const hex = raw.trim().replace(/[{}-]/g, '').toLowerCase();
	if (!/^[0-9a-f]{32}$/.test(hex)) return raw;
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Parse "YYYY-MM-DD" (optionally the date part of an RFC 3339 time) into the
// calendar date as written. Go's time.Parse keeps the string's own offset and
// Format prints that wall date, so the leading date is exactly what Go shows.
const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function civil(m: RegExpExecArray | null): { y: number; mo: number; d: number } | null {
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	const probe = new Date(Date.UTC(y, mo - 1, d));
	if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
	return { y, mo, d };
}

/** formatPilotTimestamp: ISO-8601 times and dates as "Jan 2, 2006"; anything else unchanged. */
export function formatPilotTimestamp(raw: string): string {
	const s = raw.trim();
	const c = civil(RFC3339.exec(s)) ?? civil(ISO_DATE.exec(s));
	return c ? `${MONTHS[c.mo - 1]} ${c.d}, ${c.y}` : s;
}

/** formatISODate (market_signals_data.go): "2006-01-02" → "Jan 2, 2006", else "—". */
export function formatISODate(value: string): string {
	const c = civil(ISO_DATE.exec(value.trim()));
	return c ? `${MONTHS[c.mo - 1]} ${c.d}, ${c.y}` : '—';
}

/** pilotSnapshotLabel: "2006-01-02" → "Jan 2". */
export function pilotSnapshotLabel(date: string): string {
	const c = civil(ISO_DATE.exec(date.trim()));
	return c ? `${MONTHS[c.mo - 1]} ${c.d}` : date;
}

/** formatShares (portfolio_data.go). */
export function formatShares(shares: number): string {
	return shares % 1 === 0 ? formatFloat(shares, 0) : formatFloat(shares, 2);
}

export function pilotCardVM(p: PilotSummary, followingHref: string): PilotCardVM {
	const href = '/pilots/' + pathEscape(p.slug);
	const card: PilotCardVM = {
		slug: p.slug,
		name: p.displayName,
		kindLabel: pilotKindLabel(p),
		holdingsLabel: pilotHoldingsLabel(p.holdingsCount),
		updatedLabel: '',
		hasTrades: p.holdingsCount > 0,
		href,
		followHref: '',
		followingHref
	};
	if (p.updatedAt && p.updatedAt.trim() !== '') card.updatedLabel = 'Updated ' + formatPilotTimestamp(p.updatedAt);
	if (card.hasTrades) card.followHref = card.href + '/follow';
	return card;
}

function pilotKindLabel(p: PilotSummary): string {
	if (p.kind === 'fund') return '13F fund';
	if (p.chamber != null) {
		switch (p.chamber.trim().toLowerCase()) {
			case 'house':
				return 'House';
			case 'senate':
				return 'Senate';
		}
	}
	return 'Congress';
}

function pilotHoldingsLabel(count: number): string {
	if (count <= 0) return NO_TRADES_YET;
	if (count === 1) return '1 holding';
	return `${count} holdings`;
}

export function pilotFollowRowVM(f: PilotFollowResponse): FollowRowVM {
	const paused = f.status === 'paused';
	const id = uuidString(f.id);
	return {
		id,
		href: '/pilot-follows/' + id,
		pilotSlug: f.pilot.slug,
		pilotName: f.pilot.displayName,
		targetLabel: pilotTargetLabel(f.targetKind),
		statusLabel: paused ? 'Paused' : 'Active',
		paused
	};
}

function pilotTargetLabel(kind: string): string {
	return kind === 'watchlist' ? 'Watchlist' : 'What-if portfolio';
}

export function followHrefForPilot(rows: FollowRowVM[], slug: string): string {
	return rows.find((row) => row.pilotSlug === slug)?.href ?? '';
}

// ---- detail ----

export function buildPilotDetailVM(d: PilotDetail, following: FollowRowVM | null): DetailVM {
	const vm: DetailVM = {
		pilot: pilotCardVM(d.pilot, ''),
		lagNote: (d.lagNote ?? '').trim(),
		skippedPutsNote: skippedPutsNote(d.skippedPuts),
		following,
		weights: [],
		disclosures: []
	};
	if (following) vm.pilot.followingHref = following.href;
	for (const weight of d.weights ?? []) {
		vm.weights.push({
			symbol: weight.symbol,
			symbolHref: pilotSymbolHref(weight.symbol),
			weight: formatFloat(weight.weight * 100, 1) + '%'
		});
	}
	for (const item of d.recentDisclosures ?? []) vm.disclosures.push(pilotDisclosureRowVM(item));
	return vm;
}

function pilotDisclosureRowVM(d: PilotDisclosureItem): DisclosureRowVM {
	const row: DisclosureRowVM = {
		symbol: d.symbol,
		symbolHref: pilotSymbolHref(d.symbol),
		side: pilotSideLabel(d.side),
		instrument: pilotInstrumentLabel(d.instrument),
		amount: pilotAmountLabel(d.amountMin, d.amountMax),
		traded: '—',
		disclosed: '—'
	};
	if (d.transactionDate != null) row.traded = formatISODate(d.transactionDate);
	else if (d.period != null) row.traded = d.period;
	if (d.disclosureDate != null) row.disclosed = formatISODate(d.disclosureDate);
	return row;
}

export function pilotSymbolHref(symbol: string): string {
	const s = symbol.trim().toUpperCase();
	return s === '' ? '' : '/portfolio/' + pathEscape(s);
}

function pilotSideLabel(side: string): string {
	switch (side) {
		case 'buy':
			return 'Buy';
		case 'sell':
			return 'Partial sale';
		case 'sell_full':
			return 'Full sale';
		case 'hold':
			return 'Held';
		default:
			return side;
	}
}

function pilotInstrumentLabel(instrument: string): string {
	switch (instrument) {
		case 'stock':
			return 'Stock';
		case 'call':
			return 'Call option';
		case 'put':
			return 'Put option (not copied)';
		default:
			return instrument;
	}
}

/** A disclosure's dollar range. Congress files ranges; "Over $X" has no upper bound. */
function pilotAmountLabel(min?: number | null, max?: number | null): string {
	if (min != null && max != null) return formatCurrency(min) + ' – ' + formatCurrency(max);
	if (min != null) return 'Over ' + formatCurrency(min);
	if (max != null) return 'Up to ' + formatCurrency(max);
	return '—';
}

function skippedPutsNote(count: number): string {
	const why = ' A simulated portfolio cannot go short, so puts are not copied.';
	if (count <= 0) return '';
	if (count === 1) return '1 put trade was skipped.' + why;
	return `${count} put trades were skipped.` + why;
}

// ---- follow form ----

export function newPilotFollowFormVM(detail: PilotDetail, isPro: boolean): FollowFormVM {
	return {
		pilot: pilotCardVM(detail.pilot, ''),
		lagNote: (detail.lagNote ?? '').trim(),
		isPro,
		target: '',
		startingCapital: '',
		watchlists: [],
		idempotencyKey: '',
		error: '',
		showUpgrade: false
	};
}

/**
 * parsePilotFollowForm: builds the create request from the form. It refuses what
 * the backend would refuse and can be checked without a call. It does not refuse
 * a free user's portfolio choice: plan state on the web can be stale, so the
 * backend's 403 decides that.
 */
export function parsePilotFollowForm(
	form: FormData,
	detail: PilotDetail,
	isPro: boolean
): { req: PilotFollowCreateRequest; vm: FollowFormVM; msg: string } {
	const vm = newPilotFollowFormVM(detail, isPro);
	vm.target = String(form.get('target') ?? '').trim();
	vm.startingCapital = String(form.get('starting_capital') ?? '').trim();
	vm.idempotencyKey = String(form.get('idempotency_key') ?? '').trim() || crypto.randomUUID();
	const req: PilotFollowCreateRequest = { pilotSlug: detail.pilot.slug, targetKind: '' };
	if (!vm.pilot.hasTrades) {
		return { req, vm, msg: NO_TRADES_YET + ' for this pilot, so there is nothing to follow yet.' };
	}
	if (vm.target === TARGET_PORTFOLIO) {
		const capital = parsePilotCapital(vm.startingCapital);
		if (capital === null) return { req, vm, msg: PILOT_CAPITAL_COPY };
		req.targetKind = 'portfolio';
		req.startingCapital = capital;
	} else if (vm.target === TARGET_NEW_WATCHLIST) {
		req.targetKind = 'watchlist';
	} else if (vm.target.startsWith(TARGET_WATCHLIST_PREFIX)) {
		const listID = vm.target.slice(TARGET_WATCHLIST_PREFIX.length);
		if (!isUUID(listID)) return { req, vm, msg: PILOT_CHOOSE_TARGET_COPY };
		req.targetKind = 'watchlist';
		req.watchlistListId = uuidString(listID);
	} else {
		return { req, vm, msg: PILOT_CHOOSE_TARGET_COPY };
	}
	return { req, vm, msg: '' };
}

/** Accepts what people type into a money field ("10,000", "$5,000"); rejects what the backend would 400. */
function parsePilotCapital(raw: string): number | null {
	const cleaned = raw.trim().replace(/[,$ ]/g, '');
	// strconv.ParseFloat: a full decimal (or inf/nan, rejected below), not a prefix.
	if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(cleaned)) return null;
	const capital = Number(cleaned);
	if (!Number.isFinite(capital) || capital <= 0 || capital > MAX_PILOT_STARTING_CAPITAL) return null;
	return capital;
}

/** pilotFollowErrorMessage: a refused create as a sentence, plus whether an upgrade would fix it. */
export function pilotFollowErrorMessage(
	status: number,
	body: unknown,
	upgrade: BillingUpgradeRequiredResponse | null
): { message: string; showUpgrade: boolean } {
	switch (status) {
		case 400:
			return { message: apiErrorMessage(body, PILOT_CAPITAL_COPY), showUpgrade: false };
		case 403:
			return pilotUpgradeMessage(upgrade);
		case 404:
			return { message: apiErrorMessage(body, 'That pilot or list no longer exists.'), showUpgrade: false };
		case 409:
			return { message: apiErrorMessage(body, 'This pilot has no disclosures yet. Try again later.'), showUpgrade: false };
		case 422:
			return { message: apiErrorMessage(body, 'Choose an empty watchlist, or let Norviq create one.'), showUpgrade: false };
		default:
			return { message: 'Could not start following. Try again shortly.', showUpgrade: false };
	}
}

/**
 * Reads the backend's upgrade body. A 403 without one is a missing scope, which
 * an upgrade would not fix. Decides by feature and limit, never by plan name.
 */
function pilotUpgradeMessage(upgrade: BillingUpgradeRequiredResponse | null): { message: string; showUpgrade: boolean } {
	if (!upgrade || upgrade.code !== 'upgrade_required') {
		return { message: 'Your account cannot follow pilots right now.', showUpgrade: false };
	}
	if (upgrade.feature === 'portfolio_lists') {
		return { message: 'You have reached 25 portfolios. Archive one, or follow into a watchlist.', showUpgrade: false };
	}
	// "pilot_follows"
	if (upgrade.limit == null) {
		return { message: 'Following into a what-if portfolio needs Pro. Free includes one watchlist follow.', showUpgrade: true };
	}
	if (upgrade.limit < PILOT_PRO_FOLLOW_LIMIT) {
		return {
			message: `Free includes ${pilotFollowCount(upgrade.limit)}. Upgrade to Pro to follow up to ${PILOT_PRO_FOLLOW_LIMIT} pilots.`,
			showUpgrade: true
		};
	}
	return {
		message: `Your plan allows ${pilotFollowCount(upgrade.limit)} and you have used them all. Stop one to follow another.`,
		showUpgrade: false
	};
}

function pilotFollowCount(count: number): string {
	return count === 1 ? '1 pilot follow' : `${count} pilot follows`;
}

// ---- follow detail ----

export function buildPilotFollowDetailVM(f: PilotFollowResponse): FollowDetailVM {
	const paused = f.status === 'paused';
	const isPortfolio = f.targetKind !== 'watchlist';
	const vm: FollowDetailVM = {
		id: uuidString(f.id),
		pilot: pilotCardVM(f.pilot, ''),
		targetLabel: pilotTargetLabel(f.targetKind),
		targetLinkLabel: '',
		targetHref: '',
		statusLabel: paused ? 'Paused' : 'Active',
		paused,
		waiting: f.appliedVersion === 0,
		isPortfolio,
		startingCapital: '—',
		latestValue: '—',
		change: '—',
		changeTone: '',
		chartLabels: [],
		chartValues: [],
		chartNote: '',
		events: [],
		eventsError: false,
		notice: '',
		error: ''
	};
	if (isPortfolio && f.portfolioListId) {
		vm.targetHref = '/portfolio?portfolio=' + uuidString(f.portfolioListId);
		vm.targetLinkLabel = 'Open portfolio';
	} else if (!isPortfolio && f.watchlistListId) {
		vm.targetHref = '/portfolio/watchlist?list=' + uuidString(f.watchlistListId);
		vm.targetLinkLabel = 'Open watchlist';
	}
	if (f.startingCapital != null) vm.startingCapital = formatPilotMoney(f.startingCapital, f.currency);
	return vm;
}

/** applyPilotSnapshots: the value strip and the chart data. The chart needs two points. */
export function applyPilotSnapshots(vm: FollowDetailVM, f: PilotFollowResponse, snaps: PilotFollowSnapshotResponse[]) {
	if (snaps.length === 0) {
		vm.chartNote = 'No daily snapshot yet. Norviq records the simulated value once a day.';
		return;
	}
	const latest = snaps[snaps.length - 1];
	vm.latestValue = formatPilotMoney(latest.value, f.currency);
	if (f.startingCapital != null && f.startingCapital > 0) {
		const pct = ((latest.value - f.startingCapital) / f.startingCapital) * 100;
		const formatted = formatFloat(pct, 2);
		vm.change = (formatted.startsWith('-') ? '' : '+') + formatted + '% since start';
		if (pct > 0) vm.changeTone = 'positive';
		else if (pct < 0) vm.changeTone = 'negative';
	}
	if (snaps.length < 2) {
		vm.chartNote = 'The value chart appears after two daily snapshots.';
		return;
	}
	vm.chartLabels = snaps.map((s) => pilotSnapshotLabel(s.date));
	vm.chartValues = snaps.map((s) => s.value);
}

export function pilotEventRows(events: PilotFollowEventResponse[]): EventRowVM[] {
	return events.map((event) => {
		const [label, tone] = pilotEventLabel(event.kind);
		return {
			when: formatPilotTimestamp(event.pricedAt),
			label,
			tone,
			symbol: event.symbol,
			symbolHref: pilotSymbolHref(event.symbol),
			quantity: event.quantity != null ? formatShares(event.quantity) : '—',
			price: event.price != null ? formatCurrency(event.price) : '—',
			note: event.note != null ? event.note.trim() : ''
		};
	});
}

function pilotEventLabel(kind: string): [string, EventRowVM['tone']] {
	switch (kind) {
		case 'buy':
			return ['Bought', 'positive'];
		case 'sell':
			return ['Sold', 'negative'];
		case 'watch_added':
			return ['Added to watchlist', 'positive'];
		case 'watch_exited':
			return ['Marked exited', 'negative'];
		case 'skipped_unpriced':
			return ['Skipped: no price', ''];
		case 'skipped_limit':
			return ['Skipped: watchlist full', ''];
		default:
			return [kind, ''];
	}
}

/** USD (the default) uses the app's "$1,234.56" format; anything else is prefixed with its code. */
function formatPilotMoney(value: number, currency: string): string {
	const code = (currency ?? '').trim().toUpperCase();
	if (code === '' || code === 'USD') return formatCurrency(value);
	return code + ' ' + formatCurrency(value).replace('$', '');
}
