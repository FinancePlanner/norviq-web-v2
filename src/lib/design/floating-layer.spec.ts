// Guards the floating layer (DS 2.0 spec §6.6). Under 1024px, unlock toasts sit
// at the top, below the mobile top bar, and the Quick Assistant (Q) button keeps
// the bottom-right corner, lifted above the tab bar by --float-offset, so a toast
// and Q never land on the same spot. At 1024px and up Q lives in the desktop top
// bar (DesktopTopBar.svelte): there is no floating button, and toasts sit
// top-right, below that bar (--app-desktop-topbar-height).
//
// The sources are ?raw imports rather than fs reads, so they sit in the module graph and
// `vitest --changed` re-runs this file when any of them changes.
import { describe, expect, it } from 'vitest';

import SHELL from '../styles/legacy/css/shell.css?raw';
import THEME from '../styles/legacy/theme.css?raw';
import QUICK from '../features/dashboard/assistant/components/QuickAssistant.svelte?raw';
import DESIGN from '../../../DESIGN.md?raw';

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

	it('takes the top-right corner, below the desktop top bar, at 1024px and up', () => {
		expect(valueOf(desktop[0], 'top')).toBe('calc(var(--app-desktop-topbar-height) + 0.75rem)');
		expect(valueOf(desktop[0], 'right')).toBe('1.5rem');
		expect(valueOf(desktop[0], 'left')).toBe('auto');
	});

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

	it('stays under the toast (z-index 45) on phones', () => {
		expect(valueOf(base[0], 'z-index')).toBe('45');
	});

	// Q is the top bar's "Ask Q" at 1024px and up.
	it('is hidden at 1024px and up', () => {
		expect(desktop).toHaveLength(1);
		expect(valueOf(desktop[0], 'display')).toBe('none');
	});
});

describe('floating layer: Quick Assistant card', () => {
	const style = /<style>([\s\S]*?)<\/style>/.exec(QUICK)?.[1] ?? '';
	const { base, desktop } = rulesFor(style, '.quick-q-card');

	it('rises from the bottom edge on phones', () => {
		expect(base).toHaveLength(1);
		expect(valueOf(base[0], 'margin')).toBe('auto auto 0.75rem');
	});

	// Under the top bar's "Ask Q", where it was opened from.
	it('hangs top-right, below the desktop top bar, at 1024px and up', () => {
		expect(desktop).toHaveLength(1);
		expect(valueOf(desktop[0], 'margin')).toBe(
			'calc(var(--app-desktop-topbar-height) + 0.5rem) 1.5rem auto auto'
		);
	});

	// Hung from the top, a card taller than the room below the bar runs off a
	// short window (the wide card did below ~633px).
	const room = 'calc(100dvh - var(--app-desktop-topbar-height) - 2rem)';
	it('fits below the desktop top bar on a short window', () => {
		expect(valueOf(desktop[0], 'max-height')).toBe(`min(40rem, ${room})`);
		const wide = rulesFor(style, '.quick-q-card.quick-q-wide').desktop;
		expect(wide).toHaveLength(1);
		expect(valueOf(wide[0], 'max-height')).toBe(`min(52rem, ${room})`);
	});

	// Ruling (P3 Task 3 review): at 1024px and up the Q card and the unlock toast
	// share the top-right slot on purpose. The open card is a user-opened modal in
	// the top layer; the toast stays a role="status" announcement under it.
	it('is documented in DESIGN.md as covering the toast on desktop by design', () => {
		const section = DESIGN.slice(DESIGN.indexOf('### Floating layer'));
		expect(section.slice(0, section.indexOf('\n### ', 4))).toMatch(
			/open Q card covers the (unlock )?toast[^.]*by design/
		);
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

	// Undefined, it would invalidate the desktop toast's and Q card's calc(…).
	it('defines --app-desktop-topbar-height in :root', () => {
		expect(valueOf(root, '--app-desktop-topbar-height')).toBe('4.25rem');
	});
});
