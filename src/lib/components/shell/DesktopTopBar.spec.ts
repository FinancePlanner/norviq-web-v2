import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';

// t() reads the locale from page.data.
vi.mock('$app/state', () => ({ page: { data: { locale: 'en' } } }));

import DesktopTopBar from './DesktopTopBar.svelte';

const bar = (props: { domainLabel: string | null; qMode: 'card' | 'link' }) =>
	render(DesktopTopBar, { props }).body;

const WEEKDAYS = /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/;

describe('DesktopTopBar (SSR)', () => {
	it('shows the domain, search, notifications and Ask Q as a link to full Q', () => {
		const html = bar({ domainLabel: 'Today', qMode: 'link' });
		expect(html).toContain('Today');
		expect(html).toMatch(
			/<button[^>]*>(?:(?!<\/button>)[\s\S])*Search holdings, pages, actions(?:(?!<\/button>)[\s\S])*<kbd[^>]*>⌘K<\/kbd>/
		);
		expect(html).toMatch(/<a[^>]*href="\/notifications"[^>]*aria-label="Notifications"/);
		expect(html).toMatch(/<a[^>]*href="\/assistant"[^>]*>(?:(?!<\/a>)[\s\S])*Ask Q/);
	});

	// Worker time is UTC: the date waits for the browser's zone.
	it('prints no date on the server', () => {
		expect(bar({ domainLabel: 'Today', qMode: 'link' })).not.toMatch(WEEKDAYS);
	});

	it('opens the Q card from a button when the card is mounted', () => {
		const html = bar({ domainLabel: 'Wealth', qMode: 'card' });
		expect(html).toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Ask Q/);
		expect(html).not.toContain('href="/assistant"');
	});

	// The shortcut is announced once, through aria-keyshortcuts, not read out as "⌘K".
	it('names the search button by its label alone', () => {
		const button = /<button[^>]*>(?:(?!<\/button>)[\s\S])*Search holdings/.exec(
			bar({ domainLabel: null, qMode: 'link' })
		)?.[0];
		expect(button).toMatch(/^<button[^>]*aria-keyshortcuts="Meta\+K Control\+K"/);
		expect(button ?? '').not.toMatch(/<kbd(?![^>]*aria-hidden="true")[^>]*>/);
		expect(bar({ domainLabel: null, qMode: 'link' })).toMatch(
			/<kbd[^>]*aria-hidden="true"[^>]*>⌘K/
		);
	});

	it('renders without a domain', () => {
		const html = bar({ domainLabel: null, qMode: 'link' });
		expect(html).toContain('Search holdings, pages, actions');
		expect(html).not.toContain('·');
	});
});
