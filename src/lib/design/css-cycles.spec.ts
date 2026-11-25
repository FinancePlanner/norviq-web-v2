// Guards the production CSS against custom properties that reference
// themselves. A cycle such as `--motion-fast: var(--motion-fast, 140ms)` is
// invalid at computed-value time, so every `var(--motion-fast)` without a
// fallback silently resolves to nothing and transitions are lost.
//
// The sources arrive through import.meta.glob(..., ?raw) rather than fs, so they sit in the
// module graph and `vitest --changed` re-runs this file on a CSS-only or .svelte-only change.
import { describe, expect, it } from 'vitest';

const STYLES = 'src/lib/styles/legacy/styles.css';

// Keys are root-relative ('/src/…'); strip the slash to get repo paths.
const raw = (sources: Record<string, string>) =>
	Object.entries(sources).map(([key, text]) => ({ path: key.replace(/^\//, ''), text }));
const cssSources = raw(
	import.meta.glob<string>('/src/**/*.css', { query: '?raw', import: 'default', eager: true })
);
const svelteSources = raw(
	import.meta.glob<string>('/src/**/*.svelte', { query: '?raw', import: 'default', eager: true })
);

// Tailwind maps utilities onto runtime vars inside `@theme` / `@theme inline`
// blocks, where `--color-x: var(--color-x)` is emitted in `@layer theme`.
// Unlayered runtime tokens (theme.css) override that layer, so those lines are
// not cycles at runtime and are excluded from the scan.
function stripThemeBlocks(text: string): string {
	let out = '';
	let i = 0;
	for (;;) {
		const at = text.slice(i).search(/@theme\b[^{;]*\{/);
		if (at === -1) return out + text.slice(i);
		const open = i + at;
		const brace = text.indexOf('{', open);
		let depth = 0;
		let end = brace;
		for (; end < text.length; end++) {
			if (text[end] === '{') depth++;
			else if (text[end] === '}' && --depth === 0) break;
		}
		out += text.slice(i, open);
		i = end + 1;
	}
}

/** The text between the `{` at `open` and its matching `}`. */
function braceBody(text: string, open: number): string {
	let depth = 0;
	for (let i = open; i < text.length; i++) {
		if (text[i] === '{') depth++;
		else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i);
	}
	throw new Error('unbalanced braces');
}

/** Every `selector { body }` rule directly inside a `@media (prefers-reduced-motion: reduce)` block. */
function reducedMotionRules(text: string): { selector: string; body: string }[] {
	const rules: { selector: string; body: string }[] = [];
	for (const m of text.matchAll(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g)) {
		const inner = braceBody(text, m.index + m[0].length - 1);
		for (let i = 0; i < inner.length;) {
			const open = inner.indexOf('{', i);
			if (open === -1) break;
			const body = braceBody(inner, open);
			rules.push({ selector: inner.slice(i, open).trim(), body });
			i = open + body.length + 2;
		}
	}
	return rules;
}

const files = cssSources.map(({ path, text }) => ({ path, text: stripThemeBlocks(text) }));

describe('custom properties in production CSS', () => {
	it('finds css files to check', () => {
		expect(files.length).toBeGreaterThan(0);
	});

	it('no custom property references itself', () => {
		const cycles: string[] = [];
		for (const { path, text } of files) {
			for (const match of text.matchAll(/(--[\w-]+)\s*:\s*([^;}]*)/g)) {
				const [, name, value] = match;
				const self = new RegExp('var\\(\\s*' + name + '\\s*[,)]');
				if (self.test(value)) cycles.push(`${path}: ${name}`);
			}
		}
		expect(cycles, `self-referencing custom properties:\n${cycles.join('\n')}`).toEqual([]);
	});

	it('keeps the global reduced-motion kill switch', () => {
		const text = files.find((f) => f.path === STYLES)?.text ?? '';
		const rules = reducedMotionRules(text);
		const kill = rules.find((r) => /^\*\s*,\s*\*::before\s*,\s*\*::after$/.test(r.selector));
		expect(
			kill,
			`${STYLES} has no @media (prefers-reduced-motion: reduce) rule for "*, *::before, *::after"`
		).toBeDefined();
		expect(kill?.body).toMatch(/(transition-duration|animation-duration)\s*:/);
	});
});

describe('buttons', () => {
	it('no class="btn" without a rule', () => {
		const offenders = svelteSources
			.filter(({ text }) => text.includes('class="btn"'))
			.map(({ path }) => path);
		expect(offenders, 'class="btn" has no CSS rule; use GhostButton/SecondaryButton').toEqual([]);
	});
});
