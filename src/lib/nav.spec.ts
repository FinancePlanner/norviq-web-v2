import { describe, expect, it } from 'vitest';
import { activeTab, bottomTabsMore, isMoreTab, Path, sidebarItemsFor, socialOff } from './nav.js';

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
