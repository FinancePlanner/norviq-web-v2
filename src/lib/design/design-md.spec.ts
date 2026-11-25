// DESIGN.md's front matter is read by design tools and agents, so it must say
// exactly what ships. Every colour in it is a token from design/tokens.json,
// written as the same OKLCH the generator emits; the display face is the
// token's stack. Edit tokens.json, run `bun run tokens`, then copy the value.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { oklchCss } from '../../../scripts/tokens/oklch.mjs';

const read = (path: string) =>
	readFileSync(fileURLToPath(new URL(`../../../${path}`, import.meta.url)), 'utf8');

type Json = Record<string, unknown>;
const tokens = JSON.parse(read('design/tokens.json')) as Json;

/** The token at a dotted path. */
function token(path: string): Json {
	const found = path.split('.').reduce<unknown>((node, key) => (node as Json)?.[key], tokens);
	if (!found || typeof found !== 'object') throw new Error(`no token ${path}`);
	return found as Json;
}

function hex(path: string, scope: 'light' | 'dark'): string {
	const t = token(path);
	return scope === 'light'
		? (t.$value as string)
		: (t.$extensions as { norviq: { dark: string } }).norviq.dark;
}

const frontMatter = /^---\n([\s\S]*?)\n---\n/.exec(read('DESIGN.md'))?.[1] ?? '';

/** `  key: 'value'` lines of one top-level block of the front matter. */
function block(name: string): Map<string, string> {
	const body = new RegExp(`^${name}:\\n((?:  .*\\n?)*)`, 'm').exec(frontMatter)?.[1] ?? '';
	return new Map(
		[...body.matchAll(/^ {2}([\w-]+): '([^']*)'$/gm)].map((m) => [m[1], m[2]] as const)
	);
}

// DESIGN.md colour name -> token path and scope.
const COLORS: Record<string, [string, 'light' | 'dark']> = {
	'deep-gold': ['color.accent.action', 'light'],
	'champagne-gold': ['color.accent.action', 'dark'],
	'precision-gold': ['color.accent.focus', 'dark'],
	'warm-page': ['color.surface.page', 'light'],
	'card-white': ['color.surface.card', 'light'],
	'warm-raised': ['color.surface.raised', 'light'],
	'sidebar-warm': ['color.surface.sidebar', 'light'],
	'warm-hairline': ['color.border.default', 'light'],
	'warm-control-border': ['color.border.control', 'light'],
	'midnight-navy': ['color.surface.card', 'dark'],
	'slate-secondary': ['color.text.secondary', 'light'],
	obsidian: ['color.surface.page', 'dark'],
	'armor-blue': ['color.surface.raised', 'dark'],
	'deep-graphite': ['color.surface.fill', 'dark'],
	platinum: ['color.text.primary', 'dark'],
	'muted-silver': ['color.text.secondary', 'dark'],
	'navy-control-border': ['color.border.control', 'dark'],
	'gain-light': ['color.data.gain', 'light'],
	'loss-light': ['color.data.loss', 'light'],
	'warning-light': ['color.data.warning', 'light'],
	'info-light': ['color.data.info', 'light'],
	'flat-light': ['color.data.flat', 'light'],
	'gain-dark': ['color.data.gain', 'dark'],
	'loss-dark': ['color.data.loss', 'dark'],
	'warning-dark': ['color.data.warning', 'dark'],
	'info-dark': ['color.data.info', 'dark'],
	'flat-dark': ['color.data.flat', 'dark']
};

describe('DESIGN.md front matter', () => {
	const colors = block('colors');

	it('lists only colours that map to a token', () => {
		expect(colors.size).toBeGreaterThan(0);
		expect([...colors.keys()].sort()).toEqual(Object.keys(COLORS).sort());
	});

	it('gives each colour the OKLCH the generator emits for its token', () => {
		for (const [name, [path, scope]] of Object.entries(COLORS))
			expect(colors.get(name), `${name} = ${path} ${scope}`).toBe(oklchCss(hex(path, scope)));
	});

	it('names the display face with the token stack', () => {
		const family = /^ {2}display-serif:\n {4}fontFamily: '([^']*)'$/m.exec(frontMatter)?.[1];
		expect(family).toBe((token('font.display').$value as string[]).join(', '));
	});
});
