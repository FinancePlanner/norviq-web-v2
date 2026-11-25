// Guards the floating layer (DS 2.0 spec §6.6). Unlock toasts sit at the top
// of the viewport: below the mobile top bar under 1024px, in the top-right
// corner at 1024px and up. The Quick Assistant (Q) button keeps the bottom-right
// corner, so a toast and Q can never land on the same spot. Q's lift above the
// tab bar is the --float-offset token, which P3 reuses for the Q entry point.
//
// The sources are ?raw imports rather than fs reads, so they sit in the module graph and
// `vitest --changed` re-runs this file when any of them changes.
import { describe, expect, it } from 'vitest';

import SHELL from '../styles/legacy/css/shell.css?raw';
import THEME from '../styles/legacy/theme.css?raw';
import QUICK from '../features/dashboard/assistant/components/QuickAssistant.svelte?raw';

const DESKTOP = '@media (min-width: 1024px)';

const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '');

// The body of the `{ … }` block whose opening brace follows `from`, braces
// matched the same way css-cycles.spec.ts walks @theme blocks.
function blockAt(text: string, from: number): string {
	const brace = text.indexOf('{', from);
	let depth = 0;
	let end = brace;
	for (; end < text.length; end++) {
		if (text[end] === '{') depth++;
		else if (text[end] === '}' && --depth === 0) break;
	}
	return text.slice(brace + 1, end);
}

// Every top-level rule for exactly `selector` (`.a {`, never `.a.b {`), split
// into rules outside any at-rule and rules inside `@media (min-width: 1024px)`.
function rulesFor(text: string, selector: string): { base: string[]; desktop: string[] } {
	const css = stripComments(text);
	const exact = new RegExp('(^|[\\s,}])' + selector.replace(/[.]/g, '\\.') + '\\s*\\{', 'g');
	const media: [number, number][] = [];
	for (let at = css.indexOf(DESKTOP); at !== -1; at = css.indexOf(DESKTOP, at + 1)) {
		media.push([at, at + DESKTOP.length + blockAt(css, at).length + 2]);
	}
	const base: string[] = [];
	const desktop: string[] = [];
	for (const match of css.matchAll(exact)) {
		const start = match.index + match[1].length;
		const body = blockAt(css, start);
		(media.some(([from, to]) => start > from && start < to) ? desktop : base).push(body);
	}
	return { base, desktop };
}

const declares = (body: string, property: string) =>
	new RegExp('(^|[;{\\s])' + property + '\\s*:').test(body);
const valueOf = (body: string, property: string) =>
	new RegExp('(?:^|[;{\\s])' + property + '\\s*:\\s*([^;]+);').exec(body)?.[1].trim();

describe('floating layer: unlock toast', () => {
	const { base, desktop } = rulesFor(SHELL, '.achievement-toast');

	it('has one base rule and one desktop rule', () => {
		expect(base).toHaveLength(1);
		expect(desktop).toHaveLength(1);
	});

	it('sits at the top on phones, below the top bar, and never at the bottom', () => {
		expect(valueOf(base[0], 'top')).toBe(
			'calc(var(--app-topbar-height) + max(0.75rem, env(safe-area-inset-top, 0px)))'
		);
		expect(declares(base[0], 'bottom')).toBe(false);
	});

	it('keeps its side insets, width cap and z-index on phones', () => {
		expect(valueOf(base[0], 'left')).toBe('calc(0.75rem + env(safe-area-inset-left, 0px))');
		expect(valueOf(base[0], 'right')).toBe('calc(0.75rem + env(safe-area-inset-right, 0px))');
		expect(valueOf(base[0], 'max-width')).toBe('28rem');
		expect(valueOf(base[0], 'z-index')).toBe('50');
	});

	it('takes the top-right corner at 1024px and up', () => {
		expect(valueOf(desktop[0], 'top')).toBe('1.5rem');
		expect(valueOf(desktop[0], 'right')).toBe('1.5rem');
		expect(valueOf(desktop[0], 'left')).toBe('auto');
	});

	// Overlap guard: Q owns the bottom-right corner at 1024px and up.
	it('declares no bottom at 1024px and up', () => {
		expect(declares(desktop[0], 'bottom')).toBe(false);
	});
});

describe('floating layer: Quick Assistant button', () => {
	const style = /<style>([\s\S]*?)<\/style>/.exec(QUICK)?.[1] ?? '';
	const { base, desktop } = rulesFor(style, '.quick-q-button');

	it('lifts above the tab bar by --float-offset on phones', () => {
		expect(base).toHaveLength(1);
		expect(valueOf(base[0], 'bottom')).toBe(
			'calc(var(--app-tabbar-height) + env(safe-area-inset-bottom, 0px) + var(--float-offset))'
		);
	});

	it('stays under the toast (z-index 45) and bottom-right at 1024px and up', () => {
		expect(valueOf(base[0], 'z-index')).toBe('45');
		expect(desktop).toHaveLength(1);
		expect(valueOf(desktop[0], 'bottom')).toBe('1.5rem');
		expect(valueOf(desktop[0], 'right')).toBe('1.5rem');
	});
});

describe('floating layer: tokens', () => {
	const theme = stripComments(THEME);
	const root = blockAt(theme, theme.indexOf(':root'));

	it('defines --float-offset in :root', () => {
		expect(valueOf(root, '--float-offset')).toBe('0.5rem');
	});

	// Undefined, it would invalidate the toast's whole `top: calc(…)`.
	it('defines --app-topbar-height in :root', () => {
		expect(valueOf(root, '--app-topbar-height')).toBeTruthy();
	});
});
