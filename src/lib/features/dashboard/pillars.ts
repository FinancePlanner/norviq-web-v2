// Port of the parts of norviq-web internal/onboarding/pillars.go the dashboard
// uses (ResolvePillar, ResolvePillars). Kept in the dashboard feature folder;
// the expenses domain may own a fuller port later.

export interface BudgetPillarDef {
	key: string;
	label: string;
	hint: string;
	icon: string;
	colorVar: string;
	defaultShare: number;
	sortRank: number;
	isCustom: boolean;
}

export const BudgetPillars: readonly BudgetPillarDef[] = [
	{
		key: 'fundamentals',
		label: 'Fundamentals',
		hint: 'Rent, groceries, utilities',
		icon: 'house',
		colorVar: '--color-pillar-fundamentals',
		defaultShare: 0.5,
		sortRank: 0,
		isCustom: false
	},
	{
		key: 'futureYou',
		label: 'Future you',
		hint: 'Investing, debt payoff, savings',
		icon: 'trending-up',
		colorVar: '--color-pillar-future-you',
		defaultShare: 0.2,
		sortRank: 1,
		isCustom: false
	},
	{
		key: 'fun',
		label: 'Fun',
		hint: 'Dining, travel, hobbies',
		icon: 'sparkles',
		colorVar: '--color-pillar-fun',
		defaultShare: 0.3,
		sortRank: 2,
		isCustom: false
	}
];

const customPillarColorVars = [
	'--color-pillar-custom-1',
	'--color-pillar-custom-2',
	'--color-pillar-custom-3',
	'--color-pillar-custom-4',
	'--color-pillar-custom-5',
	'--color-pillar-custom-6',
	'--color-pillar-custom-7'
];

function canonicalPillarKey(key: string): string {
	return key.toLowerCase().replace(/[ \-_]/g, '');
}

function humanisePillarKey(key: string): string {
	let out = '';
	[...key].forEach((r, i) => {
		const upper = r !== r.toLowerCase() && r === r.toUpperCase();
		out += i > 0 && upper ? ' ' + r.toLowerCase() : r;
	});
	out = out.trim();
	if (!out) return key;
	return out[0].toUpperCase() + out.slice(1);
}

function pillarColorIndex(key: string): number {
	let sum = 0;
	for (const r of key) sum += r.codePointAt(0) ?? 0;
	return sum % customPillarColorVars.length;
}

export function resolvePillar(key: string | null | undefined): BudgetPillarDef {
	const trimmed = (key ?? '').trim();
	if (!trimmed) return BudgetPillars[0];
	const canonical = canonicalPillarKey(trimmed);
	for (const p of BudgetPillars) if (canonicalPillarKey(p.key) === canonical) return p;
	return {
		key: trimmed,
		label: humanisePillarKey(trimmed),
		hint: 'Custom spending category.',
		icon: 'layers',
		colorVar: customPillarColorVars[pillarColorIndex(trimmed)],
		defaultShare: 0,
		sortRank: 3,
		isCustom: true
	};
}

function sortPillars(defs: BudgetPillarDef[]) {
	defs.sort((a, b) =>
		a.sortRank !== b.sortRank
			? a.sortRank - b.sortRank
			: a.label < b.label
				? -1
				: a.label > b.label
					? 1
					: 0
	);
}

export function resolvePillars(...extraKeys: string[]): BudgetPillarDef[] {
	const out = [...BudgetPillars];
	const seen = new Set(BudgetPillars.map((p) => p.key.toLowerCase()));
	for (const key of extraKeys) {
		const trimmed = key.trim();
		if (!trimmed) continue;
		const lower = trimmed.toLowerCase();
		if (seen.has(lower)) continue;
		seen.add(lower);
		out.push(resolvePillar(trimmed));
	}
	sortPillars(out);
	return out;
}
