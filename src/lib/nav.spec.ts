import { describe, expect, it } from 'vitest';
import ptPT from './i18n/pt-PT.json';
import {
	activeTab,
	bottomTabs,
	bottomTabsMore,
	isMoreTab,
	Path,
	sidebarItemsFor,
	socialOff,
	type SocialConfig
} from './nav.js';

const id = (s: string) => s;
const items = (social = socialOff) =>
	sidebarItemsFor(id, { social, articles: false, locked: null });

describe('tools navigation', () => {
	it('puts Tools directly after Portfolio', () => {
		const paths = items().map((i) => i.path);
		expect(paths[paths.indexOf(Path.Portfolio) + 1]).toBe('/tools');
	});
	it('gives the group one All tools child', () => {
		const group = items().find((i) => i.path === '/tools');
		expect(group?.children?.map((c) => [c.label, c.path])).toEqual([['All tools', '/tools']]);
	});
	it('leaves Portfolio children in place', () => {
		const children = items().find((i) => i.path === Path.Portfolio)?.children ?? [];
		expect(children.map((c) => c.path)).toContain('/planning/grow');
	});
	it('keeps sidebar group tabs unique with every social flag on', () => {
		const tabs = items({
			...socialOff,
			enabled: true,
			groups: true,
			leaderboards: true,
			achievements: true
		}).map((i) => i.tab);
		expect(new Set(tabs).size).toBe(tabs.length);
	});
	it('maps /tools to the tools tab', () => {
		expect(activeTab('/tools')).toBe('tools');
	});
	it('reaches Tools from the bottom More list', () => {
		expect(bottomTabsMore(id, socialOff).map((i) => i.path)).toContain('/tools');
		expect(isMoreTab('tools')).toBe(true);
	});
});

describe('pt-PT navigation', () => {
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

	it('translates every navigation label (DS 2.0 A10)', () => {
		const seen = new Set<string>();
		const capture = (s: string) => {
			seen.add(s);
			return s;
		};
		sidebarItemsFor(capture, { social: allSocial, articles: true, locked: () => false });
		bottomTabs(capture);
		bottomTabsMore(capture, allSocial);
		const catalog = new Set(Object.keys(ptPT));
		expect(seen.size).toBeGreaterThan(40);
		expect([...seen].filter((key) => !catalog.has(key)).sort()).toEqual([]);
	});
});
