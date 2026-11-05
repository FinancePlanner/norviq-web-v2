import { describe, expect, it } from 'vitest';
import { Feature } from '#lib/billing.js';
import { Circle } from '@lucide/svelte';
import { sidebarIcon } from '#lib/components/shell/nav-icons.js';
import pt from '#lib/i18n/pt-PT.json';
import { toolIsLocked, toolsCatalog } from './catalog.js';

const rebalancing = toolsCatalog.find((e) => e.path === '/portfolio/rebalancing')!;
const grow = toolsCatalog.find((e) => e.path === '/planning/grow')!;

describe('toolsCatalog', () => {
	it('lists the five tools in order', () => {
		expect(toolsCatalog.map((e) => e.path)).toEqual([
			'/planning/grow',
			'/planning/retire',
			'/terminal',
			'/simulator',
			'/portfolio/rebalancing'
		]);
	});
	it('does not list dividends', () => {
		expect(toolsCatalog.some((e) => e.path.includes('dividends'))).toBe(false);
	});
	it('answers the original request on Grow', () => {
		expect(grow.question).toBe('How much will I have in X years?');
	});
	it('marks a locked feature for a free user', () => {
		const features = { [Feature.RebalancingRules]: false };
		expect(toolIsLocked(rebalancing, features, false)).toBe(true);
	});
	it('does not mark an available feature', () => {
		const features = { [Feature.RebalancingRules]: true };
		expect(toolIsLocked(rebalancing, features, false)).toBe(false);
	});
	it('draws no marks when billing is unknown', () => {
		expect(toolIsLocked(rebalancing, {}, true)).toBe(false);
	});
	it('never marks a tool with no feature key', () => {
		expect(toolIsLocked(grow, {}, false)).toBe(false);
	});
	it('gives every tool a real icon, not the fallback circle', () => {
		const fallback = toolsCatalog.filter((e) => sidebarIcon(e.path) === Circle).map((e) => e.path);
		expect(fallback).toEqual([]);
	});
	it('has pt-PT for every question and the page subtitle', () => {
		const strings = pt as Record<string, string>;
		for (const e of toolsCatalog) expect(strings[e.question]).toBeTruthy();
		expect(strings['Calculators and planners for your money, in one place.']).toBeTruthy();
	});
});
