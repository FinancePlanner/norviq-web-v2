import { describe, expect, it } from 'vitest';
import { Feature } from '#lib/billing.js';
import ptPT from '#lib/i18n/pt-PT.json';
import { translator } from '#lib/i18n/index.js';
import { socialOff, type SocialConfig } from '#lib/nav.js';
import type { NavContext } from '#lib/nav/visible.js';
import { paletteActions, paletteDestinations, rankPalette, type PaletteItem } from './palette.js';

const id = (s: string) => s;
const pt = translator('pt-PT');

const allSocial: SocialConfig = {
	enabled: true,
	contactsDiscovery: true,
	xImport: true,
	facebookImport: true,
	leaderboards: true,
	messaging: true,
	groups: true,
	groupsPublic: true,
	achievements: true,
	activityFeed: true
};
const allOn: NavContext = { social: allSocial, articles: true, locked: null };
const allOff: NavContext = { social: socialOff, articles: false, locked: null };

/** What the palette ranks: the actions, then the destinations. */
const itemsOf = (t: (s: string) => string, ctx: NavContext) => [
	...paletteActions(t),
	...paletteDestinations(t, ctx)
];
const hrefs = (items: readonly PaletteItem[]) => items.map((i) => i.href);
const item = (label: string): PaletteItem => ({ kind: 'destination', label, href: '/' + label });

describe('paletteActions', () => {
	it('records spend, adds a holding and asks Q, in that order', () => {
		expect(hrefs(paletteActions(id))).toEqual([
			'/expenses/record',
			'/portfolio?add=position',
			'/assistant'
		]);
		expect(paletteActions(id).map((a) => a.label)).toEqual([
			'Record spend',
			'Add holding',
			'Ask Q'
		]);
		expect(paletteActions(id).every((a) => a.kind === 'action')).toBe(true);
	});
});

describe('paletteDestinations', () => {
	it('leaves out every gated destination and child while its gate is off', () => {
		const paths = hrefs(paletteDestinations(id, allOff));
		expect(paths).not.toContain('/friends');
		for (const gated of [
			'/groups',
			'/groups/discover',
			'/friends/leaderboard',
			'/xp',
			'/achievements',
			'/articles'
		]) {
			expect(paths).not.toContain(gated);
		}
		expect(hrefs(paletteDestinations(id, allOn))).toEqual(
			expect.arrayContaining(['/friends', '/groups', '/groups/discover', '/achievements'])
		);
	});

	it('keeps a Pro-locked destination listed', () => {
		const locked: NavContext = { ...allOn, locked: () => true };
		expect(hrefs(paletteDestinations(id, locked))).toContain('/forecast');
	});

	it('marks Pro-locked rows, children included, as the sidebar badges them', () => {
		const free: NavContext = { ...allOn, locked: () => true };
		const row = (ctx: NavContext, href: string) =>
			paletteDestinations(id, ctx).find((i) => i.href === href);
		expect(row(free, '/forecast')?.pro).toBe(true);
		expect(row(free, '/reports/advanced')?.pro).toBe(true);
		expect(row(free, '/goals')).not.toHaveProperty('pro');
		// A Pro member, and unknown entitlement (no badges, as in the sidebar).
		for (const ctx of [
			{ ...allOn, locked: () => false },
			{ ...allOn, locked: null }
		]) {
			expect(paletteDestinations(id, ctx).filter((i) => 'pro' in i)).toEqual([]);
		}
	});

	it('names each path once, by its destination (§4.4)', () => {
		const list = paletteDestinations(id, allOn);
		expect(new Set(hrefs(list)).size).toBe(list.length);
		const label = (href: string) => list.find((i) => i.href === href)?.label;
		// A child chip on its parent's own path is not a second name for it.
		expect(label('/expenses')).toBe('Budget');
		expect(label('/markets')).toBe('Markets');
		expect(label('/economy')).toBe('Economy');
		expect(label('/settings')).toBe('Settings');
		expect(label('/expenses/year')).toBe('Spending log');
		// Children with their own path are reachable.
		expect(label('/markets/congress')).toBe('Congress');
		expect(label('/settings/language')).toBe('Language');
	});

	it('hints each row with its domain, and Account for account pages', () => {
		const list = paletteDestinations(id, allOn);
		const hint = (href: string) => list.find((i) => i.href === href)?.hint;
		expect(hint('/forecast')).toBe('Planning');
		expect(hint('/markets/congress')).toBe('Intelligence');
		expect(hint('/settings/language')).toBe('Account');
		expect(list.every((i) => i.kind === 'destination')).toBe(true);
	});

	it('lists the sidebar picks first, in domain order', () => {
		expect(hrefs(paletteDestinations(id, allOff).slice(0, 7))).toEqual([
			'/dashboard',
			'/dashboard/pulse',
			'/dashboard/activity',
			'/assistant',
			'/notifications',
			'/expenses',
			'/expenses/year'
		]);
	});

	it('sends every label and hint through t, each with a pt-PT entry', () => {
		const seen = new Set<string>();
		const capture = (s: string) => {
			seen.add(s);
			return s;
		};
		itemsOf(capture, allOn);
		const catalog = new Set(Object.keys(ptPT));
		expect(seen.size).toBeGreaterThan(60);
		expect([...seen].filter((key) => !catalog.has(key)).sort()).toEqual([]);
	});
});

describe('rankPalette', () => {
	it('begins an empty query with the three actions, then the picks', () => {
		const ranked = rankPalette('', itemsOf(id, allOn));
		expect(ranked).toHaveLength(8);
		expect(hrefs(ranked.slice(0, 3))).toEqual([
			'/expenses/record',
			'/portfolio?add=position',
			'/assistant'
		]);
		// Ask Q is already listed as an action; the Today picks follow without it.
		expect(hrefs(ranked.slice(3))).toEqual([
			'/dashboard',
			'/dashboard/pulse',
			'/dashboard/activity',
			'/notifications',
			'/expenses'
		]);
	});

	it('keeps the Pro mark of a row it folds into an earlier one', () => {
		// Ask Q is an action and a Pro destination: its one row carries the badge.
		const aiLocked: NavContext = { ...allOn, locked: (f) => f === Feature.AIInsights };
		const askQ = rankPalette('ask', itemsOf(id, aiLocked)).filter((i) => i.href === '/assistant');
		expect(askQ).toEqual([{ kind: 'action', label: 'Ask Q', href: '/assistant', pro: true }]);
		expect(rankPalette('ask', itemsOf(id, allOn))[0]).not.toHaveProperty('pro');
	});

	it('puts "Net worth forecast" first for "net"', () => {
		expect(rankPalette('net', itemsOf(id, allOn))[0]?.label).toBe('Net worth forecast');
	});

	it('matches pt-PT labels without their accents', () => {
		const ranked = rankPalette('previsao', itemsOf(pt, allOn));
		expect(ranked[0]?.label).toBe('Previsão do património');
		expect(ranked[0]?.href).toBe('/forecast');
		expect(rankPalette('PATRIMÓNIO', itemsOf(pt, allOn))[0]?.href).toBe('/forecast');
	});

	it('ranks a label prefix, then a word prefix, then a substring; ties keep input order', () => {
		const items = [item('Bond ladder'), item('Ladder'), item('Gladder'), item('Ladders')];
		expect(rankPalette('ladder', items).map((i) => i.label)).toEqual([
			'Ladder',
			'Ladders',
			'Bond ladder',
			'Gladder'
		]);
	});

	it('returns nothing when no label contains the query', () => {
		expect(rankPalette('zzz', itemsOf(id, allOn))).toEqual([]);
	});

	it('stops at the limit', () => {
		expect(rankPalette('', itemsOf(id, allOn), 4)).toHaveLength(4);
		expect(rankPalette('e', itemsOf(id, allOn))).toHaveLength(8);
	});
});
