// design/tokens.json is the single source for Norviq's design values (DS 2.0
// § 5.1, owner verdict Q3). Web generates its colour CSS from it, iOS its
// colour sets; both check spacing, radius, type and motion against it. These
// tests pin its shape and the identity values that must never drift.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const TOKENS_PATH = fileURLToPath(new URL('../../../design/tokens.json', import.meta.url));

type Json = Record<string, unknown>;
interface ColorToken {
	path: string;
	light: string;
	dark: string;
	css?: string;
	ios?: string;
}

function load(): Json {
	return JSON.parse(readFileSync(TOKENS_PATH, 'utf8')) as Json;
}

/** Every leaf (an object with $value) under the tree, keyed by its dotted path. */
function leaves(node: Json, prefix = ''): [string, Json][] {
	return Object.entries(node).flatMap(([key, value]) => {
		if (key.startsWith('$') || !value || typeof value !== 'object') return [];
		const path = prefix ? `${prefix}.${key}` : key;
		const child = value as Json;
		return '$value' in child ? [[path, child] as [string, Json]] : leaves(child, path);
	});
}

function colorTokens(tree: Json): ColorToken[] {
	return leaves(tree)
		.filter(([, t]) => t.$type === 'color')
		.map(([path, t]) => {
			const norviq = ((t.$extensions as Json | undefined)?.norviq ?? {}) as Json;
			return {
				path,
				light: t.$value as string,
				dark: norviq.dark as string,
				css: norviq.css as string | undefined,
				ios: norviq.ios as string | undefined
			};
		});
}

const HEX = /^#[0-9A-F]{6}([0-9A-F]{2})?$/;

const REQUIRED_COLORS = [
	'color.surface.page',
	'color.surface.card',
	'color.surface.raised',
	'color.surface.chrome',
	'color.surface.scrim',
	'color.text.primary',
	'color.text.secondary',
	'color.text.tertiary',
	'color.text.onAccent',
	'color.accent.action',
	'color.accent.wash',
	'color.accent.focus',
	'color.accent.secondary',
	'color.border.hairline',
	'color.border.control',
	'color.data.gain',
	'color.data.loss',
	'color.data.flat',
	'color.data.warning',
	'color.data.info',
	'color.chart.axis',
	'color.chart.grid',
	'color.chart.line',
	'color.chart.lineAlt',
	'color.chart.tooltipBg',
	'color.chart.tooltipBorder',
	'color.chart.tooltipText',
	'color.pillar.fundamentals',
	'color.pillar.futureYou',
	'color.pillar.fun',
	...[1, 2, 3, 4, 5, 6, 7].map((n) => `color.pillar.custom${n}`)
];

// docs/precision-identity.md: these are the brand, and no generator may move them.
const IDENTITY: Record<string, [string, string]> = {
	'color.surface.page': ['#F7F4EE', '#0A101A'],
	'color.surface.card': ['#FFFFFF', '#111B2B'],
	'color.accent.action': ['#80612A', '#D8B477'],
	'color.data.gain': ['#1B6E51', '#42B894'],
	'color.data.loss': ['#AB3640', '#E16D75'],
	'color.text.primary': ['#111B2B', '#E9E9E5']
};

describe('design/tokens.json', () => {
	it('gives every colour token an uppercase #RRGGBB[AA] light and dark value', () => {
		const colors = colorTokens(load());
		expect(colors.length).toBeGreaterThan(0);
		for (const c of colors) {
			expect(c.light, `${c.path} $value`).toMatch(HEX);
			expect(c.dark, `${c.path} dark`).toMatch(HEX);
		}
	});

	it('has every semantic role of spec § 5.1', () => {
		const paths = new Set(colorTokens(load()).map((c) => c.path));
		for (const path of REQUIRED_COLORS) expect(paths.has(path), path).toBe(true);
	});

	it('keeps the identity values', () => {
		const byPath = new Map(colorTokens(load()).map((c) => [c.path, c]));
		for (const [path, [light, dark]] of Object.entries(IDENTITY)) {
			expect(byPath.get(path)?.light, `${path} light`).toBe(light);
			expect(byPath.get(path)?.dark, `${path} dark`).toBe(dark);
		}
	});

	it('maps each CSS property and each iOS colour set from one token only', () => {
		const colors = colorTokens(load());
		const css = colors.flatMap((c) => (c.css ? [c.css] : []));
		const ios = colors.flatMap((c) => (c.ios ? [c.ios] : []));
		expect(new Set(css).size).toBe(css.length);
		expect(new Set(ios).size).toBe(ios.length);
		for (const name of css) expect(name).toMatch(/^--[a-z0-9-]+$/);
	});

	it('has the non-colour groups, with the display face falling back to a serif', () => {
		const tree = load() as Record<string, Json>;
		for (const group of ['space', 'radius', 'type', 'font', 'motion'])
			expect(tree[group], group).toBeTypeOf('object');
		const display = (tree.font.display as Json).$value as string[];
		expect(display[0]).toBe('Brygada 1918');
		expect(display.at(-1)).toBe('serif');
	});
});
