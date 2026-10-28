import { expect, it } from 'vitest';
import { build, queryEscape, tag } from './sharelinks.js';

// Cases ported from norviq-web internal/sharelinks/sharelinks_test.go.

it('tag appends to an existing query', () => {
	expect(tag('https://www.norviq.org/brief/2026-10-15/evening', 'x')).toBe(
		'https://www.norviq.org/brief/2026-10-15/evening?utm_source=x&utm_medium=share'
	);
	expect(tag('https://www.norviq.org/brief/2026-10-15/evening?lang=pt-PT', 'copy')).toBe(
		'https://www.norviq.org/brief/2026-10-15/evening?lang=pt-PT&utm_source=copy&utm_medium=share'
	);
});

it('reddit and whatsapp are encoded', () => {
	const links = build({
		canonical: 'https://www.norviq.org/brief/2026-10-15/evening?lang=pt-PT',
		title: 'Resumo do fecho — 15 out. 2026 & mais'
	});
	expect(links.reddit).toBe(
		'https://www.reddit.com/submit?url=https%3A%2F%2Fwww.norviq.org%2Fbrief%2F2026-10-15%2Fevening%3Flang%3Dpt-PT%26utm_source%3Dreddit%26utm_medium%3Dshare&title=Resumo%20do%20fecho%20%E2%80%94%2015%20out.%202026%20%26%20mais'
	);
	expect(links.whatsApp).toBe(
		'https://wa.me/?text=Resumo%20do%20fecho%20%E2%80%94%2015%20out.%202026%20%26%20mais%20https%3A%2F%2Fwww.norviq.org%2Fbrief%2F2026-10-15%2Fevening%3Flang%3Dpt-PT%26utm_source%3Dwhatsapp%26utm_medium%3Dshare'
	);

	// Round trip: what the network decodes is the title and the tagged URL.
	const reddit = new URL(links.reddit);
	expect(reddit.searchParams.get('title')).toBe('Resumo do fecho — 15 out. 2026 & mais');
	expect(reddit.searchParams.get('url')).toBe(
		'https://www.norviq.org/brief/2026-10-15/evening?lang=pt-PT&utm_source=reddit&utm_medium=share'
	);
	expect(new URL(links.whatsApp).searchParams.get('text')).toBe(
		'Resumo do fecho — 15 out. 2026 & mais https://www.norviq.org/brief/2026-10-15/evening?lang=pt-PT&utm_source=whatsapp&utm_medium=share'
	);
});

it('builds without disclaimer or tickers', () => {
	const links = build({ canonical: 'https://x.test/p', title: 'T', captionCTA: 'See it.' });
	expect(links.discordText).toBe('**T**\nhttps://x.test/p?utm_source=discord&utm_medium=share');
	expect(links.instagramCaption).toBe('T\n\nSee it.');
	expect(links.x).toBe('https://x.com/intent/post?text=T&url=https%3A%2F%2Fx.test%2Fp%3Futm_source%3Dx%26utm_medium%3Dshare');
});

it('builds with tickers, bullets and a disclaimer', () => {
	const links = build({
		canonical: 'https://x.test/p',
		title: 'Close',
		tickers: ['NVDA', 'BRK.B'],
		bullets: ['one', 'two'],
		disclaimer: 'Not advice.',
		captionCTA: 'Link in bio.'
	});
	expect(links.x).toBe(
		'https://x.com/intent/post?text=Close+%24NVDA+%24BRK.B&url=https%3A%2F%2Fx.test%2Fp%3Futm_source%3Dx%26utm_medium%3Dshare'
	);
	expect(links.discordText).toBe('**Close**\n• one\n• two\nhttps://x.test/p?utm_source=discord&utm_medium=share\nNot advice.');
	expect(links.instagramCaption).toBe('Close\n\n$NVDA $BRK.B\n\nLink in bio.\nNot advice.');
	expect(links.linkedIn).toBe(
		'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fx.test%2Fp%3Futm_source%3Dlinkedin%26utm_medium%3Dshare'
	);
	expect(links.copy).toBe('https://x.test/p?utm_source=copy&utm_medium=share');
});

it('queryEscape matches url.QueryEscape', () => {
	expect(queryEscape("a b!'()*~._-")).toBe('a+b%21%27%28%29%2A~._-');
});
