import { describe, expect, it } from 'vitest';
import { buildPage, buildToast } from './viewmodel.js';
import type { AchievementsResponse } from './types.js';

// Mirrors the fixture in norviq-web internal/server/achievements_routes_test.go.
const fixture: AchievementsResponse = {
	summary: { unlocked: 2, total: 6, hiddenRemaining: 1 },
	categories: [
		{ key: 'habits', title: 'Habits' },
		{ key: 'performance', title: 'Performance' },
		{ key: 'empty', title: 'Empty' }
	],
	achievements: [
		{
			key: 'streak.days',
			category: 'habits',
			title: 'On a roll',
			description: 'Check in',
			iconKey: 'flame.fill',
			state: 'inProgress',
			currentTier: 'bronze',
			progress: { current: 4, target: 7 },
			isPerformance: false,
			tiers: [
				{ tier: 'bronze', xp: 10, unlockedAt: '2026-10-01T00:00:00Z', showcaseRank: 1 },
				{ tier: 'silver', xp: 20 },
				{ tier: 'gold', xp: 30 }
			]
		},
		{ key: 'first.budget', category: 'habits', title: 'Budgeter', description: 'Make a budget', iconKey: 'cart.fill', state: 'earned', isPerformance: false, tiers: [{ tier: '', xp: 5, unlockedAt: '2026-10-02T00:00:00Z' }] },
		{ key: 'locked.one', category: 'habits', title: 'Later', description: 'Not yet', iconKey: 'nope', state: 'locked', isPerformance: false, tiers: [{ tier: '', xp: 5 }] },
		{ key: 'hidden.1', category: 'habits', title: '???', description: 'secret', iconKey: 'star.fill', state: 'hidden', isPerformance: false, tiers: [{ tier: '', xp: 0 }] },
		{ key: 'beat.market', category: 'performance', title: 'Beat it', description: 'Perf', iconKey: 'trophy.fill', state: 'earned', currentTier: 'bronze', progress: { current: 1, target: 2 }, isPerformance: true, tiers: [{ tier: 'bronze', xp: 5, unlockedAt: '2026-10-03T00:00:00Z' }] }
	]
};

describe('buildPage', () => {
	const vm = buildPage(fixture);
	const card = (key: string) => vm.sections.flatMap((s) => s.cards).find((c) => c.key === key)!;

	it('keeps category order and drops empty categories', () => {
		expect(vm.sections.map((s) => s.key)).toEqual(['habits', 'performance']);
	});

	it('puts the pinned card in the showcase and unpins with the rest', () => {
		expect(vm.showcase.map((c) => c.key)).toEqual(['streak.days']);
		expect(card('streak.days').pinned).toBe(true);
		expect(card('streak.days').formItems).toEqual([]);
		expect(card('first.budget').canPin).toBe(true);
		expect(card('first.budget').formItems).toEqual(['streak.days|bronze', 'first.budget|']);
	});

	it('never shows a hidden name and never pins performance', () => {
		const hidden = card('hidden.1');
		expect(hidden.title).toBe('');
		expect(hidden.description).toBe('');
		expect(hidden.icon).toBe('lock');
		expect(hidden.canPin).toBe(false);
		expect(card('beat.market').canPin).toBe(false);
		expect(card('beat.market').showProgress).toBe(false);
		expect(card('streak.days').showProgress).toBe(true);
		expect(card('locked.one').icon).toBe('award');
	});
});

describe('buildToast', () => {
	it('names one unlock and counts several', () => {
		const u = { id: '1', key: 'k', tier: 'gold', title: 'T', description: '', iconKey: '', xp: 1, unlockedAt: '' };
		expect(buildToast([u])).toEqual({ count: 1, title: 'T', tier: 'gold' });
		expect(buildToast([u, { ...u, id: '2' }])).toEqual({ count: 2, title: '', tier: '' });
	});
});
