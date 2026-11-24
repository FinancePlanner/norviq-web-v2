// The web's colours are generated from design/tokens.json by
// scripts/tokens/build.mjs. These tests prove the generator changed no colour
// (every generated OKLCH sits within an OKLab distance of 0.005 of the literal
// theme.css held before, see __fixtures__/theme-before.json), that the committed
// output is fresh, that the non-colour values in CSS equal the tokens, and that
// Brygada 1918 (font.display) is the global display face for page titles only.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from 'svelte/server';
import { afterAll, describe, expect, it } from 'vitest';
import DocumentPage from '../components/norviq/vigil/DocumentPage.svelte';
import { hexToOklch, oklchToOklab } from '../../../scripts/tokens/oklch.mjs';
import { DARK, LIGHT } from '../charts/palette.generated.js';
import { PAGE_BG } from '../theme-color.generated.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const BUILD = join(ROOT, 'scripts/tokens/build.mjs');

type Json = Record<string, unknown>;
interface ColorToken {
	path: string;
	light: string;
	dark: string;
	css?: string;
}
type Scope = 'light' | 'dark';

const tokens = JSON.parse(read('design/tokens.json')) as Json;

function leaves(node: Json, prefix = ''): [string, Json][] {
	return Object.entries(node).flatMap(([key, value]) => {
		if (key.startsWith('$') || !value || typeof value !== 'object') return [];
		const path = prefix ? `${prefix}.${key}` : key;
		const child = value as Json;
		return '$value' in child ? [[path, child] as [string, Json]] : leaves(child, path);
	});
}

const colors: ColorToken[] = leaves(tokens)
	.filter(([, t]) => t.$type === 'color')
	.map(([path, t]) => {
		const norviq = (t.$extensions as { norviq: Json }).norviq;
		return {
			path,
			light: t.$value as string,
			dark: norviq.dark as string,
			css: norviq.css as string | undefined
		};
	});
const byPath = new Map(colors.map((c) => [c.path, c]));
const value = (path: string) => (leaves(tokens).find(([p]) => p === path)?.[1] ?? {}).$value;

/** Custom-property declarations of one block, e.g. `:root {` or `html.dark {`. */
function declarations(css: string, selector: string): Map<string, string> {
	const start = css.indexOf(`${selector} {`);
	if (start < 0) return new Map();
	const body = css.slice(start, css.indexOf('\n}', start));
	return new Map(
		[...body.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()] as const)
	);
}

/** The value a scope resolves to: html.dark inherits what it does not redeclare. */
function scoped(css: string): Record<Scope, Map<string, string>> {
	const light = declarations(css, ':root');
	return { light, dark: new Map([...light, ...declarations(css, 'html.dark')]) };
}

interface Oklch {
	l: number;
	c: number;
	h: number;
	alpha: number;
}

function parseOklch(text: string): Oklch {
	const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+)%)?\)$/.exec(text);
	if (!m) throw new Error(`not an oklch literal: ${text}`);
	return { l: +m[1], c: +m[2], h: +m[3], alpha: m[4] === undefined ? 1 : +m[4] / 100 };
}

function distance(a: Oklch, b: Oklch): number {
	const [l1, a1, b1] = oklchToOklab(a.l, a.c, a.h);
	const [l2, a2, b2] = oklchToOklab(b.l, b.c, b.h);
	return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

// Where the before-literal and the token's hex genuinely disagree. Each was
// measured, is under the ~0.02 OKLab just-noticeable difference, and is listed
// in the PR body. Nothing else may exceed 0.005.
const KNOWN_DRIFT: Record<string, { max: number; why: string }> = {
	'--color-border-control light': {
		max: 0.0065,
		why: 'precision-identity.md says #8E8676 (contrast measured on it); the old OKLCH was #8C8476'
	},
	'--color-pillar-custom-2 light': {
		max: 0.0071,
		why: 'oklch(0.62 0.12 220) is outside sRGB; the token holds its sRGB clip, #0096B8'
	}
};

describe('hexToOklch', () => {
	it('converts champagne gold as DESIGN.md states it', () => {
		const g = hexToOklch('#D8B477');
		expect(g.l).toBeCloseTo(0.788, 2);
		expect(Math.abs(g.c - 0.089)).toBeLessThan(0.002);
		expect(Math.abs(g.h - 80)).toBeLessThan(1);
		expect(g.alpha).toBe(1);
	});

	it('converts obsidian', () => {
		const o = hexToOklch('#0A101A');
		expect(Math.abs(o.l - 0.172)).toBeLessThan(0.002);
		expect(Math.abs(o.c - 0.023)).toBeLessThan(0.002);
		expect(Math.abs(o.h - 260)).toBeLessThan(1);
	});

	it('reads the alpha byte', () => {
		expect(hexToOklch('#0A101A73').alpha).toBeCloseTo(115 / 255, 6);
	});
});

describe('theme.tokens.css', () => {
	const generated = scoped(read('src/lib/styles/legacy/theme.tokens.css'));
	const before = JSON.parse(read('src/lib/design/__fixtures__/theme-before.json')) as Record<
		string,
		Record<Scope, string>
	>;

	it('declares every token that has a css name, in both scopes', () => {
		for (const c of colors.filter((t) => t.css)) {
			expect(generated.light.get(c.css!), `${c.css} light`).toMatch(/^oklch\(/);
			expect(generated.dark.get(c.css!), `${c.css} dark`).toMatch(/^oklch\(/);
		}
	});

	it('changes no colour: each value is within 0.005 OKLab of the old literal', () => {
		const named = colors.filter((t) => t.css);
		expect(Object.keys(before).sort()).toEqual(named.map((t) => t.css!).sort());
		for (const c of named) {
			for (const scope of ['light', 'dark'] as const) {
				const key = `${c.css} ${scope}`;
				const now = parseOklch(generated[scope].get(c.css!)!);
				const was = parseOklch(before[c.css!][scope]);
				expect(now.alpha, `${key} alpha`).toBe(was.alpha);
				expect(distance(now, was), key).toBeLessThan(KNOWN_DRIFT[key]?.max ?? 0.005);
			}
		}
	});

	it('leaves no generated property hand-written in theme.css, which imports the generated file first', () => {
		const theme = read('src/lib/styles/legacy/theme.css');
		const hand = scoped(theme);
		for (const c of colors.filter((t) => t.css)) {
			expect(hand.light.has(c.css!), `${c.css} in theme.css`).toBe(false);
			expect(hand.dark.has(c.css!), `${c.css} in theme.css html.dark`).toBe(false);
		}
		const firstRule = theme
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.trim()
			.split('\n')[0];
		expect(firstRule).toBe("@import './theme.tokens.css';");
		// Every remaining colour in theme.css is an alias or a shadow, never a literal.
		const literals = (['light', 'dark'] as const).flatMap((scope) =>
			[...hand[scope]].filter(
				([name, text]) => !name.startsWith('--panel-shadow') && text.includes('oklch(')
			)
		);
		expect(literals).toEqual([]);
	});
});

describe('palette.generated.ts', () => {
	const chart: Record<string, string> = {
		axis: 'color.chart.axis',
		grid: 'color.chart.grid',
		line: 'color.chart.line',
		lineAlt: 'color.chart.lineAlt',
		up: 'color.data.gain',
		down: 'color.data.loss',
		tooltipBg: 'color.chart.tooltipBg',
		tooltipBorder: 'color.chart.tooltipBorder',
		tooltipText: 'color.chart.tooltipText',
		pointer: 'color.chart.pointer',
		emphasisBorder: 'color.surface.card'
	};

	it('holds the chart tokens, light and dark', () => {
		for (const [key, path] of Object.entries(chart)) {
			expect(LIGHT[key as keyof typeof LIGHT], key).toBe(byPath.get(path)!.light.toLowerCase());
			expect(DARK[key as keyof typeof DARK], key).toBe(byPath.get(path)!.dark.toLowerCase());
		}
	});

	it('draws the dark value line in platinum, never gold', () => {
		expect(DARK.line).toBe('#e9e9e5');
	});

	it('gives the browser chrome the page background, also in app.html', () => {
		const page = byPath.get('color.surface.page')!;
		expect(PAGE_BG).toEqual({ light: page.light.toLowerCase(), dark: page.dark.toLowerCase() });
		const html = read('src/app.html');
		expect(html).toContain(
			`<meta name="theme-color" content="${PAGE_BG.light}" media="(prefers-color-scheme: light)" />`
		);
		expect(html).toContain(
			`<meta name="theme-color" content="${PAGE_BG.dark}" media="(prefers-color-scheme: dark)" />`
		);
	});
});

describe('build.mjs --check', () => {
	const temp = mkdtempSync(join(tmpdir(), 'norviq-tokens-'));
	afterAll(() => rmSync(temp, { recursive: true, force: true }));
	const run = (...args: string[]) => {
		try {
			execFileSync(process.execPath, [BUILD, '--check', ...args], { cwd: ROOT, stdio: 'pipe' });
			return 0;
		} catch (error) {
			return (error as { status?: number }).status ?? -1;
		}
	};

	it('passes on the committed output', () => {
		expect(run()).toBe(0);
	});

	it('fails once a token changes', () => {
		const mutated = structuredClone(tokens) as { color: { data: { gain: Json } } };
		mutated.color.data.gain.$value = '#1B6E52';
		const path = join(temp, 'tokens.json');
		writeFileSync(path, JSON.stringify(mutated));
		expect(run('--tokens', path)).toBe(1);
	});
});

describe('non-colour values in CSS equal the tokens', () => {
	const theme = declarations(read('src/lib/styles/legacy/theme.css'), ':root');
	const styles = read('src/lib/styles/legacy/styles.css');
	const themeBlock = (name: string) =>
		new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'm').exec(styles)?.[1].replace(/\s+/g, ' ').trim();
	const px = (rem: string | undefined) => `${Number.parseFloat(rem ?? 'NaN') * 16}px`;

	it('spacing and radius', () => {
		const space: Record<string, string> = {
			'1': '--space-1',
			'2': '--space-2',
			'3': '--space-3',
			'4': '--space-4',
			'6': '--space-6',
			'8': '--space-8',
			cardPad: '--card-pad',
			stackGap: '--stack-gap'
		};
		for (const [key, name] of Object.entries(space))
			expect(px(theme.get(name)), name).toBe(value(`space.${key}`));
		expect(px(theme.get('--radius-control'))).toBe(value('radius.control'));
		expect(px(theme.get('--radius'))).toBe(value('radius.card'));
		expect(px(theme.get('--radius-hero'))).toBe(value('radius.hero'));
		expect(px(themeBlock('--radius-sm'))).toBe(value('radius.sm'));
	});

	it('type ladder', () => {
		const roles = ['caption2', 'caption', 'footnote', 'subhead', 'body', 'title3', 'title2'];
		for (const role of [...roles, 'title1', 'display']) {
			expect(px(themeBlock(`--text-${role}`)), role).toBe(value(`type.${role}.size`));
			expect(px(themeBlock(`--text-${role}--line-height`)), role).toBe(
				value(`type.${role}.lineHeight`)
			);
		}
	});

	it('motion', () => {
		for (const d of ['fast', 'med', 'slow'])
			expect(theme.get(`--motion-${d}`)).toBe(value(`motion.${d}`));
		for (const e of ['standard', 'emphasized', 'decelerate', 'expo'])
			expect(theme.get(`--ease-${e}`)).toBe(
				`cubic-bezier(${(value(`motion.${e}`) as number[]).join(', ')})`
			);
	});

	it('font stacks', () => {
		const stack = (families: unknown) =>
			(families as string[]).map((f) => (/[\s\d]/.test(f) ? `'${f}'` : f)).join(', ');
		expect(themeBlock('--font-sans')).toBe(stack(value('font.sans')));
		expect(themeBlock('--font-mono')).toBe(stack(value('font.mono')));
	});
});

describe('Brygada 1918, the display face (font.display)', () => {
	const BRYGADA = '/static/fonts/brygada-1918-latin-wght-normal.woff2';
	const fontFaces = (css: string) => css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
	const styles = read('src/lib/styles/legacy/styles.css');
	const surface = read('src/lib/styles/legacy/surface.css');
	const display = value('font.display') as string[];

	it('is declared once, globally, in fonts.css', () => {
		const brygada = fontFaces(read('src/lib/styles/fonts.css')).filter((f) =>
			f.includes("font-family: 'Brygada 1918'")
		);
		expect(brygada).toHaveLength(1);
		expect(brygada[0]).toContain(`src: url('${BRYGADA}')`);
		expect(brygada[0]).toContain('font-weight: 400 700');
		expect(brygada[0]).toContain('font-display: swap');
	});

	it('is --font-display, the token stack, falling back to a serif', () => {
		const stack = /^\s*--font-display:\s*([^;]+);/m.exec(styles)?.[1].trim() ?? '';
		const families = stack.split(',').map((f) => f.trim().replace(/^'|'$/g, ''));
		expect(families).toEqual(display);
		expect(families[0]).toBe('Brygada 1918');
		expect(families.at(-1)).toBe('serif');
	});

	it('leaves the brief no font of its own: it aliases the global face', () => {
		const brief = read('src/lib/features/public/brief/edition/brief.css');
		expect(fontFaces(brief)).toEqual([]);
		expect(brief).toMatch(/--mi-serif:\s*var\(--font-display\);/);
		expect(read('src/lib/features/public/brief/BriefPage.svelte')).not.toContain(BRYGADA);
	});

	it('is preloaded by the layouts that show it above the fold', () => {
		expect(read('src/routes/(app)/+layout.svelte')).toContain(BRYGADA);
		expect(read('src/routes/(public)/+layout.svelte')).toContain(BRYGADA);
	});

	// The selector list that sets the display face. Element selectors (a bare h1)
	// are not allowed: a Document page may use an h1 for a figure
	// (portfolio/one-page), and numbers never take the serif.
	const rule = /([^{}]+)\{[^}]*font-family:\s*var\(--font-display\)[^}]*\}/.exec(surface);
	const selectors = (rule?.[1] ?? '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.split(',')
		.map((s) => s.trim());

	it('sets Document-grammar page titles and the Overview greeting, semibold and balanced', () => {
		expect(selectors).toEqual([
			'.app-page-content.vigil-document-page .vigil-page-title',
			'.command-center-page .cc-greeting'
		]);
		expect(rule?.[0]).toContain('font-weight: 600');
		expect(rule?.[0]).toContain('text-wrap: balance');
	});

	it('reaches the title of a server-rendered DocumentPage', () => {
		const { body } = render(DocumentPage, { props: { title: 'Settings' } });
		expect(body).toMatch(/class="app-page-content vigil-document-page[^"]*"/);
		expect(body).toMatch(/<h1 class="vigil-page-title[^"]*">Settings<\/h1>/);
	});

	it('reaches the Overview greeting', () => {
		expect(read('src/routes/(app)/dashboard/+page.svelte')).toMatch(
			/command-center-page[\s\S]*<h1 class="cc-greeting /
		);
	});
});
