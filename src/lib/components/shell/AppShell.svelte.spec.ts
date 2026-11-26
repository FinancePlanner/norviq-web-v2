import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { createRawSnippet } from 'svelte';
import { socialOff } from '#lib/nav.js';
import { sidebarDomains } from '#lib/nav/visible.js';
import type { SearchResultVM } from '#lib/features/dashboard/panels/types.js';
import AppShellTestHost from './AppShellTestHost.svelte';
import { palette } from './palette-state.svelte.js';

// The ⌘K palette in a real browser: the three buttons and the shortcut open it,
// Escape hands focus back, and a failing symbol search leaves the rest listed.
// Signed-in pages cannot run in `bun run dev` without staging credentials, so
// this stands in for the brief's manual checks.

// UnlockToast (imported by AppShell, not mounted here) takes afterNavigate.
const nav = vi.hoisted(() => ({
	goto: vi.fn<(href: string) => Promise<void>>(() => Promise.resolve()),
	afterNavigate: () => {}
}));
vi.mock('$app/navigation', () => nav);
vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost/dashboard'),
		data: { locale: 'en', social: socialOff, articles: false, features: {}, billingUnknown: true }
	}
}));

// A page with a text field, as the Overview has its asset search.
const body = createRawSnippet(() => ({
	render: () => '<input type="search" aria-label="Asset search" />'
}));

function mount() {
	return render(AppShellTestHost, {
		props: {
			username: 'ana',
			email: 'ana@example.com',
			sidebar: sidebarDomains((s) => s, { social: socialOff, articles: false, locked: null }),
			social: socialOff,
			trialExpired: false,
			children: body
		}
	});
}

const row = (symbol: string, name: string): SearchResultVM => ({
	symbol,
	name,
	exchange: 'NASDAQ',
	href: '/portfolio/' + symbol.toLowerCase(),
	return3M: '',
	return3MClass: '',
	return6M: '',
	return6MClass: '',
	returnYTD: '',
	returnYTDClass: ''
});

const urlOf = (input: RequestInfo | URL) =>
	typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

/** Stubs fetch: /dashboard/search answers with `answer`; records what was asked. */
function stubSearch(answer: () => Promise<Response>) {
	const f = vi.fn<typeof fetch>((input) => {
		return urlOf(input).startsWith('/dashboard/search')
			? answer()
			: Promise.resolve(new Response('{}'));
	});
	vi.stubGlobal('fetch', f);
	return f;
}

const dialog = () => document.querySelector<HTMLDialogElement>('dialog.command-palette');
const combobox = () => document.querySelector<HTMLInputElement>('[role="combobox"]');
const options = () =>
	[...document.querySelectorAll<HTMLElement>('[role="option"]')].map((o) => o.textContent?.trim());
const statusText = () =>
	document.querySelector('dialog.command-palette [role="status"]')?.textContent?.trim();

const PHONE_SEARCH = '.app-topbar button[aria-label="Search and commands"]';
const openFromPhoneBar = () => document.querySelector<HTMLButtonElement>(PHONE_SEARCH)?.click();

async function paletteOpen() {
	await expect.poll(() => dialog()?.open).toBe(true);
	await expect.poll(() => document.activeElement).toBe(combobox());
}

beforeEach(() => {
	palette.open = false;
	palette.everOpened = false;
	nav.goto.mockClear();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('⌘K palette (client)', () => {
	it('is not loaded until first opened', () => {
		mount();
		expect(dialog()).toBeNull();
	});

	it.each([
		['the sidebar foot', '.app-sidebar-foot button[aria-label="Search and commands"]'],
		['the desktop top bar', '.app-desktop-topbar button[aria-keyshortcuts="Meta+K Control+K"]'],
		['the phone top bar', PHONE_SEARCH]
	])('opens from the search button in %s, and Escape returns focus to it', async (_, selector) => {
		stubSearch(() => Promise.resolve(Response.json({ query: '', results: [] })));
		mount();
		const button = document.querySelector<HTMLButtonElement>(selector);
		expect(button).not.toBeNull();
		// The bars swap at 1024px; focus and click each one whatever the viewport.
		button?.focus();
		button?.click();
		await paletteOpen();
		expect(options().slice(0, 3)).toEqual(['Record spend', 'Add holding', 'Ask Q']);

		await userEvent.keyboard('{Escape}');
		await expect.poll(() => dialog()?.open).toBe(false);
		expect(palette.open).toBe(false);
		expect(document.activeElement).toBe(button);
	});

	it('opens on ⌘K and Ctrl+K while typing in a text field', async () => {
		stubSearch(() => Promise.resolve(Response.json({ query: '', results: [] })));
		mount();
		const field = document.querySelector<HTMLInputElement>('input[aria-label="Asset search"]');
		field?.focus();
		const seen: KeyboardEvent[] = [];
		const record = (e: KeyboardEvent) => seen.push(e);
		window.addEventListener('keydown', record);
		await userEvent.keyboard('{Meta>}k{/Meta}');
		window.removeEventListener('keydown', record);
		await paletteOpen();
		// The shortcut was taken: default prevented, nothing typed into the field.
		expect(seen.find((e) => e.key === 'k')?.defaultPrevented).toBe(true);
		expect(field?.value).toBe('');

		await userEvent.keyboard('{Escape}');
		await expect.poll(() => document.activeElement).toBe(field);

		await userEvent.keyboard('{Control>}k{/Control}');
		await paletteOpen();
	});

	it('lists a symbol from /dashboard/search, and Enter goes to it', async () => {
		const f = stubSearch(() =>
			Promise.resolve(Response.json({ query: 'aapl', results: [row('AAPL', 'Apple Inc.')] }))
		);
		mount();
		openFromPhoneBar();
		await paletteOpen();
		await userEvent.keyboard('aapl');
		await expect.poll(options).toEqual(['AAPL · Apple Inc.']);
		expect(document.querySelector('[role="group"]')?.textContent).toContain('Holdings and symbols');
		expect(f.mock.calls.map(([u]) => urlOf(u))).toEqual(['/dashboard/search?q=aapl']);

		await userEvent.keyboard('{Enter}');
		expect(nav.goto).toHaveBeenCalledWith('/portfolio/aapl');
		expect(dialog()?.open).toBe(false);
		expect(palette.open).toBe(false);
	});

	it('drops the last query’s symbols while the next search is slow', async () => {
		let slow = false;
		stubSearch(() =>
			slow
				? new Promise<Response>(() => {})
				: Promise.resolve(Response.json({ query: 'aapl', results: [row('AAPL', 'Apple Inc.')] }))
		);
		mount();
		openFromPhoneBar();
		await paletteOpen();
		await userEvent.keyboard('aapl');
		await expect.poll(options).toEqual(['AAPL · Apple Inc.']);

		slow = true;
		const input = combobox();
		if (!input) throw new Error('no combobox');
		await userEvent.fill(input, 'msft');
		await expect.poll(statusText).toBe('Searching…');
		expect(options()).toEqual([]);
		await userEvent.keyboard('{Enter}');
		expect(nav.goto).not.toHaveBeenCalled();
	});

	it('lists a symbol once when the search returns it twice', async () => {
		stubSearch(() =>
			Promise.resolve(
				Response.json({
					query: 'shel',
					results: [row('SHEL', 'Shell plc'), row('SHEL', 'Shell plc')]
				})
			)
		);
		mount();
		openFromPhoneBar();
		await paletteOpen();
		await userEvent.keyboard('shel');
		await expect.poll(options).toEqual(['SHEL · Shell plc']);
	});

	it('keeps destinations and actions listed when /dashboard/search fails', async () => {
		stubSearch(() => Promise.resolve(new Response('upstream down', { status: 502 })));
		mount();
		openFromPhoneBar();
		await paletteOpen();
		await userEvent.keyboard('net');
		await expect.poll(statusText).toBe('Symbol search is unavailable right now.');
		expect(options()[0]).toContain('Net worth forecast');
	});

	it('keeps destinations listed while /dashboard/search hangs', async () => {
		stubSearch(() => new Promise<Response>(() => {}));
		mount();
		openFromPhoneBar();
		await paletteOpen();
		await userEvent.keyboard('net');
		await expect.poll(statusText).toBe('Searching…');
		expect(options()[0]).toContain('Net worth forecast');
	});

	it('moves the active option with the arrow keys', async () => {
		stubSearch(() => Promise.resolve(Response.json({ query: '', results: [] })));
		mount();
		openFromPhoneBar();
		await paletteOpen();
		const input = combobox();
		const active = () =>
			document.getElementById(input?.getAttribute('aria-activedescendant') ?? '')?.textContent;
		expect(active()).toContain('Record spend');
		await userEvent.keyboard('{ArrowDown}');
		expect(active()).toContain('Add holding');
		await userEvent.keyboard('{ArrowUp}{ArrowUp}');
		// Wraps to the last row.
		expect(active()).toBe(
			document.querySelectorAll('[role="option"]')[options().length - 1].textContent
		);
		expect(document.querySelectorAll('[aria-selected="true"]')).toHaveLength(1);

		await userEvent.keyboard('{Enter}');
		expect(nav.goto).toHaveBeenCalledTimes(1);
	});
});
