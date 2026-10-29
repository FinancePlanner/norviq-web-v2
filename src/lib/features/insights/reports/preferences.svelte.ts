// Port of norviq-web internal/server/assets/reports-preferences.js: the
// per-browser card order and hidden set for /reports, kept in the same
// localStorage keys so existing preferences carry over.

import { cardCatalog, cardLabel as catalogLabel, type CardMeta } from './cards.js';

export const ORDER_KEY = 'reports_dashboard_order';
export const HIDDEN_KEY = 'reports_dashboard_hidden';

export interface ReportsPreferences {
	order: string[];
	hidden: string[];
}

const defaultCardOrder = (catalog: CardMeta[]) => catalog.map((c) => c.id);

function sanitizeOrder(raw: unknown, catalog: CardMeta[]): string[] | null {
	const valid = new Set(defaultCardOrder(catalog));
	if (!Array.isArray(raw)) return null;
	const order: string[] = [];
	for (const id of raw) {
		if (typeof id !== 'string' || !valid.has(id) || order.includes(id)) continue;
		order.push(id);
	}
	for (const card of catalog) if (!order.includes(card.id)) order.push(card.id);
	return order;
}

function sanitizeHidden(raw: unknown, catalog: CardMeta[]): string[] {
	const valid = new Set(defaultCardOrder(catalog));
	if (!Array.isArray(raw)) return [];
	return raw.filter((id): id is string => typeof id === 'string' && valid.has(id));
}

export function loadReportsPreferences(catalog = cardCatalog()): ReportsPreferences {
	const fallbackOrder = defaultCardOrder(catalog);
	try {
		const order = sanitizeOrder(JSON.parse(localStorage.getItem(ORDER_KEY) || 'null'), catalog);
		const hidden = sanitizeHidden(JSON.parse(localStorage.getItem(HIDDEN_KEY) || 'null'), catalog);
		return { order: order || fallbackOrder, hidden };
	} catch {
		return { order: fallbackOrder, hidden: [] };
	}
}

export function saveReportsPreferences(prefs: ReportsPreferences) {
	try {
		localStorage.setItem(ORDER_KEY, JSON.stringify(prefs.order));
		localStorage.setItem(HIDDEN_KEY, JSON.stringify(prefs.hidden));
	} catch {
		/* storage unavailable (private mode): the change lives for this page only */
	}
}

function notifyChartsResize() {
	window.dispatchEvent(new Event('overviewChartsResize'));
}

/** After the DOM settles (Alpine's $nextTick). */
const nextTick = (fn: () => void) => queueMicrotask(() => requestAnimationFrame(fn));

/**
 * reportsPage(tab): Alpine x-data → a rune-backed store. `ready` stays false
 * during SSR and until the browser preferences are read, which is what Go's
 * x-cloak hid; until then cards follow the tab only.
 */
export class ReportsPageState {
	readonly tab: string;
	readonly catalog = cardCatalog();
	showCustomize = $state(false);
	ready = $state(false);
	prefs = $state<ReportsPreferences>({ order: defaultCardOrder(cardCatalog()), hidden: [] });

	constructor(tab: string) {
		this.tab = tab || '';
	}

	/** Call once in the browser (onMount). */
	init() {
		this.prefs = loadReportsPreferences(this.catalog);
		this.ready = true;
	}

	cardLabel(cardID: string) {
		return catalogLabel(cardID);
	}

	isHidden(cardID: string) {
		return this.ready && this.prefs.hidden.includes(cardID);
	}

	cardVisible(cardID: string) {
		if (this.isHidden(cardID)) return false;
		return this.catalog.find((c) => c.id === cardID)?.tabs.includes(this.tab) ?? false;
	}

	cardOrderStyle(cardID: string): string | undefined {
		if (!this.ready) return undefined;
		const idx = this.prefs.order.indexOf(cardID);
		return idx >= 0 ? `order: ${idx}` : undefined;
	}

	visibleCount() {
		return this.prefs.order.filter((id) => this.cardVisible(id)).length;
	}

	toggleCard(cardID: string) {
		if (this.isHidden(cardID)) this.prefs.hidden = this.prefs.hidden.filter((id) => id !== cardID);
		else this.prefs.hidden = [...this.prefs.hidden, cardID];
		saveReportsPreferences($state.snapshot(this.prefs));
		nextTick(notifyChartsResize);
	}

	moveCard(index: number, delta: number) {
		const next = index + delta;
		if (next < 0 || next >= this.prefs.order.length) return;
		const order = [...this.prefs.order];
		const [item] = order.splice(index, 1);
		order.splice(next, 0, item);
		this.prefs.order = order;
		saveReportsPreferences($state.snapshot(this.prefs));
		nextTick(notifyChartsResize);
	}

	resetPreferences() {
		this.prefs = { order: defaultCardOrder(this.catalog), hidden: [] };
		saveReportsPreferences($state.snapshot(this.prefs));
		nextTick(notifyChartsResize);
	}

	closeCustomize() {
		this.showCustomize = false;
		nextTick(notifyChartsResize);
	}
}
