// Guards the production CSS against custom properties that reference
// themselves. A cycle such as `--motion-fast: var(--motion-fast, 140ms)` is
// invalid at computed-value time, so every `var(--motion-fast)` without a
// fallback silently resolves to nothing and transitions are lost.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SRC = join(ROOT, 'src');
const STYLES = 'src/lib/styles/legacy/styles.css';

function cssFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) return cssFiles(full);
		return entry.endsWith('.css') ? [full] : [];
	});
}

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

const files = cssFiles(SRC).map((full) => ({
	path: relative(ROOT, full),
	text: stripThemeBlocks(readFileSync(full, 'utf8'))
}));

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
		const start = text.indexOf('@media (prefers-reduced-motion: reduce)');
		expect(start, `${STYLES} has no @media (prefers-reduced-motion: reduce)`).toBeGreaterThan(-1);
		// The block runs until the next top-level rule after its opening brace.
		const block = text.slice(start, text.indexOf('/* Reusable enter primitives', start));
		expect(block).toMatch(/\*\s*,[\s\S]*?\{[\s\S]*?(transition-duration|animation-duration)\s*:/);
	});
});

describe('buttons', () => {
	it('no class="btn" without a rule', () => {
		const offenders: string[] = [];
		const walk = (dir: string) => {
			for (const entry of readdirSync(dir)) {
				const full = join(dir, entry);
				if (statSync(full).isDirectory()) walk(full);
				else if (entry.endsWith('.svelte') && readFileSync(full, 'utf8').includes('class="btn"'))
					offenders.push(relative(ROOT, full));
			}
		};
		walk(SRC);
		expect(offenders, 'class="btn" has no CSS rule; use GhostButton/SecondaryButton').toEqual([]);
	});
});
