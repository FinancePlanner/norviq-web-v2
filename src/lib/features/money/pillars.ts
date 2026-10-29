// Port of norviq-web internal/onboarding/pillars.go (budget pillar defs) plus
// the small pillar helpers the expenses handlers share (resolvePillarKey,
// pillarLabel, pillarIcon, categoryURL).

export interface BudgetPillarDef {
	key: string;
	label: string;
	hint: string;
	/** Lucide name resolved through Icon. */
	icon: string;
	/** CSS custom property holding the pillar color (theme.css). */
	colorVar: string;
	/** Fraction of net salary the backend assumes without an explicit share. */
	defaultShare: number;
	sortRank: number;
	isCustom: boolean;
}

export const BUDGET_PILLARS: BudgetPillarDef[] = [
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

const CUSTOM_PILLAR_COLOR_VARS = [
	'--color-pillar-custom-1',
	'--color-pillar-custom-2',
	'--color-pillar-custom-3',
	'--color-pillar-custom-4',
	'--color-pillar-custom-5',
	'--color-pillar-custom-6',
	'--color-pillar-custom-7'
];

export type PillarMap = Record<string, number> | null | undefined;

function canonicalPillarKey(key: string): string {
	return key.toLowerCase().replace(/[ \-_]/g, '');
}

function humanisePillarKey(key: string): string {
	let out = '';
	[...key].forEach((r, i) => {
		if (i > 0 && r !== r.toLowerCase() && r === r.toUpperCase()) out += ' ' + r.toLowerCase();
		else out += r;
	});
	out = out.trim();
	if (!out) return key;
	const runes = [...out];
	runes[0] = runes[0].toUpperCase();
	return runes.join('');
}

function pillarColorIndex(key: string): number {
	let sum = 0;
	for (const r of key) sum += r.codePointAt(0) ?? 0;
	return sum % CUSTOM_PILLAR_COLOR_VARS.length;
}

export function resolvePillar(key: string): BudgetPillarDef {
	const trimmed = (key ?? '').trim();
	if (!trimmed) return BUDGET_PILLARS[0];
	const canonical = canonicalPillarKey(trimmed);
	const known = BUDGET_PILLARS.find((p) => canonicalPillarKey(p.key) === canonical);
	if (known) return known;
	return {
		key: trimmed,
		label: humanisePillarKey(trimmed),
		hint: 'Custom spending category.',
		icon: 'layers',
		colorVar: CUSTOM_PILLAR_COLOR_VARS[pillarColorIndex(trimmed)],
		defaultShare: 0,
		sortRank: 3,
		isCustom: true
	};
}

function sortPillars(defs: BudgetPillarDef[]) {
	// Go sort.SliceStable on (rank, label) — byte order for labels.
	defs.sort((a, b) => (a.sortRank !== b.sortRank ? a.sortRank - b.sortRank : a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
}

export function resolvePillars(...extraKeys: string[]): BudgetPillarDef[] {
	const out: BudgetPillarDef[] = [];
	const seen = new Set<string>();
	for (const p of BUDGET_PILLARS) {
		out.push(p);
		seen.add(p.key.toLowerCase());
	}
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

export function mergePillarKeys(...maps: PillarMap[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const m of maps) {
		for (const key of Object.keys(m ?? {})) {
			const lower = key.trim().toLowerCase();
			if (!lower || seen.has(lower)) continue;
			seen.add(lower);
			out.push(key);
		}
	}
	return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function pillarValue(values: PillarMap, key: string): number {
	if (!values) return 0;
	if (key in values) return values[key];
	for (const [k, v] of Object.entries(values)) if (k.toLowerCase() === key.toLowerCase()) return v;
	return 0;
}

export function normalizeShares(shares: PillarMap): Record<string, number> | null {
	if (!shares || Object.keys(shares).length === 0) return null;
	const total = Object.values(shares).reduce((a, b) => a + b, 0);
	const divisor = total > 1.5 ? 100 : 1;
	return Object.fromEntries(Object.entries(shares).map(([k, v]) => [k, v / divisor]));
}

export function shareOrDefault(shares: PillarMap, def: BudgetPillarDef): number {
	if (shares) {
		if (def.key in shares) return shares[def.key];
		for (const [k, v] of Object.entries(shares)) if (k.toLowerCase() === def.key.toLowerCase()) return v;
	}
	return def.defaultShare;
}

/** handlers.resolvePillarKey: any non-empty key resolves. */
export function resolvePillarKey(raw: string | null | undefined): BudgetPillarDef | null {
	if (!(raw ?? '').trim()) return null;
	return resolvePillar(raw!);
}

export const pillarLabel = (key: string) => resolvePillar(key).label;

/** handlers.pillarIcon (dashboard_data.go): emoji for the activity rows. */
export function pillarIcon(pillar: string): string {
	switch (resolvePillar(pillar).key) {
		case 'fundamentals':
			return '🏠';
		case 'futureYou':
			return '🎯';
		case 'fun':
			return '🎉';
		default:
			return '💰';
	}
}
