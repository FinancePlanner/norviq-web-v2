// Port of norviq-web internal/pages/achievements/viewmodel.go and toast.go.
// Pure; safe on server and client.
import type { AchievementUnlock } from '#lib/features/social/friends/types.js';
import { achievementIcon } from './icons.js';
import { AchievementState, type Achievement, type AchievementsResponse, type AchievementSummary } from './types.js';

/** MaxShowcase is how many achievements a member can pin. */
export const MaxShowcase = 3;

/**
 * ItemSep joins a pinned achievement's key and tier in the showcase form
 * ("streak.days|bronze"; a single-tier achievement has an empty tier).
 */
export const ItemSep = '|';

export interface TierPip {
	tier: string;
	earned: boolean;
}

export interface CardViewModel {
	key: string;
	title: string;
	description: string;
	/** Lucide name for the kit Icon. */
	icon: string;
	state: string;
	tiers: TierPip[];
	/** False for performance achievements and anything the backend sent no progress for. */
	showProgress: boolean;
	current: number;
	target: number;
	pinned: boolean;
	canPin: boolean;
	/** This card's "key|tier" form value. */
	pinItem: string;
	/** The full showcase the Pin or Unpin form submits. */
	formItems: string[];
}

export interface SectionViewModel {
	key: string;
	title: string;
	cards: CardViewModel[];
}

export interface PageViewModel {
	notice: string;
	errorMessage: string;
	/** The achievements fetch failed; the page shows an empty state instead of cards. */
	loadFailed: boolean;
	summary: AchievementSummary;
	showcase: CardViewModel[];
	sections: SectionViewModel[];
}

export const isHidden = (c: Pick<CardViewModel, 'state'>) => c.state === AchievementState.Hidden;

/** cardStateClass */
export function cardStateClass(card: Pick<CardViewModel, 'state'>): string {
	switch (card.state) {
		case AchievementState.Earned:
			return 'is-earned';
		case AchievementState.InProgress:
			return 'is-progress';
		case AchievementState.Hidden:
			return 'is-hidden';
		default:
			return 'is-locked';
	}
}

/** TierLabel's i18n id; single-tier unlocks have none (the raw tier passes through). */
export function tierLabelID(tier: string): string {
	switch (tier) {
		case 'bronze':
			return 'Bronze';
		case 'silver':
			return 'Silver';
		case 'gold':
			return 'Gold';
		default:
			return tier;
	}
}

/** without drops every "key|…" entry for key. */
function without(items: string[], key: string): string[] {
	return items.filter((item) => !item.startsWith(key + ItemSep));
}

/** BuildPage turns the backend response into the page model. */
export function buildPage(resp: AchievementsResponse): PageViewModel {
	const vm: PageViewModel = {
		notice: '',
		errorMessage: '',
		loadFailed: false,
		summary: resp.summary ?? { unlocked: 0, total: 0, hiddenRemaining: 0 },
		showcase: [],
		sections: []
	};
	const all = resp.achievements ?? [];

	// The showcase, ranked, as (key, tier) pairs. Array.prototype.sort is
	// stable, like sort.SliceStable.
	const pins: { rank: number; key: string; tier: string }[] = [];
	for (const a of all) {
		if (a.state === AchievementState.Hidden) continue;
		for (const tier of a.tiers ?? []) {
			if (tier.showcaseRank != null) pins.push({ rank: tier.showcaseRank, key: a.key, tier: tier.tier });
		}
	}
	pins.sort((x, y) => x.rank - y.rank);
	const current = pins.map((p) => p.key + ItemSep + p.tier);
	const pinnedKeys = new Set(pins.map((p) => p.key));

	const card = (a: Achievement): CardViewModel => {
		const c: CardViewModel = {
			key: a.key,
			title: a.title,
			description: a.description,
			icon: achievementIcon(a.iconKey),
			state: a.state,
			tiers: [],
			showProgress: false,
			current: 0,
			target: 0,
			pinned: pinnedKeys.has(a.key),
			canPin: false,
			pinItem: '',
			formItems: []
		};
		if (a.state === AchievementState.Hidden) {
			c.title = '';
			c.description = '';
			c.icon = 'lock';
			return c;
		}
		for (const tier of a.tiers ?? []) {
			if (tier.tier !== '') c.tiers.push({ tier: tier.tier, earned: tier.unlockedAt != null });
		}
		if (a.progress && !a.isPerformance && a.progress.target > 0) {
			c.showProgress = true;
			c.current = a.progress.current;
			c.target = a.progress.target;
		}
		const earnedTier = a.currentTier ?? '';
		c.canPin = !a.isPerformance && (a.state === AchievementState.Earned || earnedTier !== '');
		c.pinItem = a.key + ItemSep + earnedTier;
		if (c.pinned) c.formItems = without(current, a.key);
		else if (c.canPin) c.formItems = [...current, c.pinItem];
		return c;
	};

	const byKey = new Map<string, CardViewModel>();
	for (const a of all) byKey.set(a.key, card(a));
	for (const p of pins) {
		const c = byKey.get(p.key);
		if (c) vm.showcase.push(c);
	}
	for (const category of resp.categories ?? []) {
		const cards = all.filter((a) => a.category === category.key).map((a) => byKey.get(a.key)!);
		if (cards.length > 0) vm.sections.push({ key: category.key, title: category.title, cards });
	}
	return vm;
}

/** ToastViewModel: one unlock names itself, several are only counted. */
export interface ToastViewModel {
	count: number;
	title: string;
	tier: string;
}

export function buildToast(unlocks: AchievementUnlock[]): ToastViewModel {
	const vm: ToastViewModel = { count: unlocks.length, title: '', tier: '' };
	if (unlocks.length === 1) {
		vm.title = unlocks[0].title;
		vm.tier = unlocks[0].tier;
	}
	return vm;
}
