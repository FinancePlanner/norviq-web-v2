import { describe, expect, it } from 'vitest';
import { render, sanitizeHref } from './markdown.js';

// Cases ported from norviq-web internal/markdown/markdown_test.go.

/** Every anchor href keyed by its text, entity-decoded the way a browser reads the attribute. */
function hrefs(html: string): Record<string, string> {
	const decode = (s: string) =>
		s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi, (_, e: string) => {
			const k = e.toLowerCase();
			if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16));
			if (k.startsWith('#')) return String.fromCodePoint(parseInt(k.slice(1), 10));
			return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[k];
		});
	const out: Record<string, string> = {};
	for (const m of html.matchAll(/<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)) {
		out[decode(m[2].replace(/<[^>]+>/g, ''))] = decode(m[1]);
	}
	return out;
}

describe('render', () => {
	it('strips dangerous markup', () => {
		const cases: Record<string, string[]> = {
			'<script>alert(1)</script>\n\nhello': ['<script', 'alert(1)'],
			'<img src=x onerror="alert(1)">': ['<img', 'onerror'],
			'[click](javascript:alert(1))': ['javascript:'],
			'<iframe src="https://evil.example"></iframe>': ['<iframe'],
			'<a href="https://x.com" onclick="steal()">x</a>': ['onclick'],
			'[x](JaVaScRiPt:alert(1))': ['javascript:', '<a'],
			'[x](data:text/html,<script>alert(1)</script>)': ['data:', '<a', '<script'],
			'![pixel](https://tracker.example/p.gif)': ['<img']
		};
		for (const [input, banned] of Object.entries(cases)) {
			const html = render(input);
			for (const b of banned) expect(html.toLowerCase(), `input ${input}`).not.toContain(b.toLowerCase());
		}
	});

	it('keeps formatting and hardens external links', () => {
		const html = render('**Bold** and [site](https://example.com)\n\n- one\n- two');
		expect(html).toContain('<strong>Bold</strong>');
		expect(html).toContain('href="https://example.com"');
		expect(html).toContain('nofollow');
		expect(html).toContain('noreferrer');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('<li>one</li>');
	});

	it('links cashtags outside code', () => {
		const html = render('I like $NVDA and ($BRK.B). Not $lower.\n\n```\n$AMD\n```');
		expect(html).toContain('<a href="/articles/ticker/NVDA">$NVDA</a>');
		expect(html).toContain('<a href="/articles/ticker/BRK.B">$BRK.B</a>');
		expect(html).not.toContain('/articles/ticker/LOWER');
		expect(html, 'code blocks stay literal').not.toContain('/articles/ticker/AMD');
	});

	it('skips cashtags in code and links', () => {
		let html = render('`buy $NVDA now`');
		expect(html).toContain('<code>buy $NVDA now</code>');
		expect(html).not.toContain('/articles/ticker/NVDA');

		expect(render('~~~\n$AMD\n~~~')).not.toContain('/articles/ticker/AMD');

		html = render('[buy $NVDA](https://example.com)');
		expect(html).toContain('href="https://example.com"');
		expect(html).toContain('>buy $NVDA</a>');
		expect(html).not.toContain('/articles/ticker/NVDA');
	});

	it('links cashtags in nested lists and clamps headings', () => {
		expect(render('- item\n    - nested $TSLA')).toContain('/articles/ticker/TSLA');
		expect(render('# Title')).toContain('<h2>Title</h2>');
		expect(render('###### deep')).toContain('<h4>deep</h4>');
	});

	// An already-sanitized href must never decode a second time into a live scheme.
	it('keeps an entity-encoded scheme inert', () => {
		const rendered = render('[ext](https://e.com) [click](&amp;#x6A;avascript&amp;colon;alert(1)//)');
		for (const [text, href] of Object.entries(hrefs(rendered))) {
			const scheme = href.trim().toLowerCase();
			for (const bad of ['javascript:', 'data:', 'vbscript:']) expect(scheme.startsWith(bad), `link ${text} href ${href}`).toBe(false);
		}
	});

	it('keeps the ampersand in a relative link', () => {
		expect(hrefs(render('[ext](https://e.com) [rel](/articles?a=1&b=2)')).rel).toBe('/articles?a=1&b=2');
	});

	it('keeps the ampersand in a mailto link', () => {
		expect(hrefs(render('[ext](https://e.com) [m](mailto:x@y.z?subject=a&body=b)')).m).toBe('mailto:x@y.z?subject=a&body=b');
	});
});

describe('allowlist details', () => {
	it('drops inline raw HTML but keeps its text', () => {
		expect(render('a <b>bold</b> c')).toBe('<p>a bold c</p>\n');
	});
	it('drops task-list checkboxes, image tags and table alignment', () => {
		expect(render('- [x] done')).not.toContain('<input');
		const table = render('| a | b |\n|:-|-:|\n| 1 | 2 |');
		expect(table).toContain('<th>a</th>');
		expect(table).not.toContain('align');
	});
	it('does not harden relative or mailto links', () => {
		expect(render('[r](/x)')).toBe('<p><a href="/x">r</a></p>\n');
	});
	it('keeps inline formatting inside links', () => {
		expect(render('[**b** $NVDA](https://e.com)')).toBe(
			'<p><a href="https://e.com" rel="nofollow noreferrer" target="_blank"><strong>b</strong> $NVDA</a></p>\n'
		);
	});
	it('drops an ordered list start attribute', () => {
		expect(render('3. three')).toContain('<ol>');
	});
	it('sanitizeHref follows net/url', () => {
		expect(sanitizeHref('https://a.b/c')).toEqual({ href: 'https://a.b/c', external: true });
		expect(sanitizeHref('mailto:x@y.z')).toEqual({ href: 'mailto:x@y.z', external: false });
		expect(sanitizeHref('/a:b')).toEqual({ href: '/a:b', external: false });
		expect(sanitizeHref('a:b')).toBeNull();
		expect(sanitizeHref('ftp://x')).toBeNull();
	});
});
