// Port of norviq-web internal/markdown: renders user-written article bodies to
// HTML that is safe to embed.
//
// Go runs goldmark (GFM, raw HTML disabled) and then a bluemonday allowlist.
// Neither exists in JS without a DOM (Workers has none), so this uses marked
// (GFM) with a renderer that *is* the allowlist: every token type emits only
// the elements and attributes bluemonday would have let through, and raw HTML
// is dropped at the token level. Output matches the Go web element for
// element; it is not byte-identical (bluemonday re-escapes quotes in text as
// &#34;/&#39;, which renders the same).
//
// Allowed: p br strong em del blockquote ul ol li h2 h3 h4 pre code hr table
// thead tbody tr th td a[href]. No images: a remote <img> is a tracking pixel.
import { Marked, type Tokens } from 'marked';

// Same pattern as Go: a cashtag starts a text run or follows whitespace or "(".
const cashtag = /(^|[\s(])\$([A-Z][A-Z0-9.-]{0,9})\b/g;

function escapeHTML(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto']);

interface SafeURL {
	href: string;
	/** bluemonday's "fully qualified": has a host. Gets rel=nofollow noreferrer and target=_blank. */
	external: boolean;
}

/**
 * bluemonday's href check: http/https/mailto or a relative URL, and the URL
 * must parse with Go's net/url (so no control characters, and no colon in the
 * first path segment of a scheme-less URL — which is what keeps
 * "&#x6A;avascript&colon;…" inert). Returns null when the link must go.
 */
export function sanitizeHref(raw: string): SafeURL | null {
	const href = raw.trim();
	// eslint-disable-next-line no-control-regex
	if (/[\u0000-\u001f\u007f]/.test(href)) return null;
	const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(href);
	if (scheme) {
		if (!ALLOWED_SCHEMES.has(scheme[1].toLowerCase())) return null;
		const rest = href.slice(scheme[0].length);
		return { href, external: rest.startsWith('//') && rest.length > 2 };
	}
	const firstSegment = href.split(/[/?#]/, 1)[0];
	if (firstSegment.includes(':')) return null;
	return { href, external: href.startsWith('//') && href.length > 2 };
}

/** goldmark/marked URL escaping: percent-encode what is not allowed in a URL, keep existing escapes. */
function escapeURL(href: string): string {
	try {
		return encodeURI(href).replace(/%25([0-9a-fA-F]{2})/g, '%$1');
	} catch {
		return href;
	}
}

function anchor(href: string, inner: string): string {
	const safe = sanitizeHref(href);
	if (!safe) return inner;
	const attrs = safe.external ? ' rel="nofollow noreferrer" target="_blank"' : '';
	return `<a href="${escapeHTML(escapeURL(safe.href))}"${attrs}>${inner}</a>`;
}

/**
 * Splits text around cashtags, linking each to /articles/ticker/SYM. Cashtag
 * characters are never HTML-escaped, so this works on raw or escaped text.
 */
function linkCashtags(text: string, escaped: boolean): string {
	const esc = escaped ? (s: string) => s : escapeHTML;
	let out = '';
	let pos = 0;
	for (const m of text.matchAll(cashtag)) {
		const dollar = m.index + m[1].length;
		const end = dollar + 1 + m[2].length;
		out += esc(text.slice(pos, dollar));
		out += `<a href="/articles/ticker/${m[2]}">${text.slice(dollar, end)}</a>`;
		pos = end;
	}
	return out + esc(text.slice(pos));
}

// Depth of links being rendered: cashtags inside a link's text stay literal
// (Go skips the children of Link and AutoLink nodes). Rendering is synchronous.
let linkDepth = 0;

const marked = new Marked({
	gfm: true,
	breaks: false,
	async: false,
	renderer: {
		// goldmark omits raw HTML (it is never rendered unsafe), block and inline.
		html() {
			return '';
		},
		// The sanitizer's range is h2-h4, so headings are clamped into it.
		heading({ tokens, depth }) {
			const level = Math.min(Math.max(depth, 2), 4);
			return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;
		},
		// Code stays literal: no cashtags, and no language class (stripped by bluemonday).
		code({ text }) {
			const body = text ? text.replace(/\n$/, '') + '\n' : '';
			return `<pre><code>${escapeHTML(body)}</code></pre>\n`;
		},
		codespan({ text }) {
			return `<code>${escapeHTML(text)}</code>`;
		},
		list(token: Tokens.List) {
			const tag = token.ordered ? 'ol' : 'ul';
			let body = '';
			for (const item of token.items) body += this.listitem(item);
			return `<${tag}>\n${body}</${tag}>\n`;
		},
		// Task-list checkboxes are <input>s, which the allowlist drops.
		checkbox() {
			return '';
		},
		tablecell(token: Tokens.TableCell) {
			const tag = token.header ? 'th' : 'td';
			return `<${tag}>${this.parser.parseInline(token.tokens)}</${tag}>\n`;
		},
		link({ href, tokens, text }) {
			linkDepth++;
			try {
				const inner = tokens && tokens.length > 0 ? this.parser.parseInline(tokens) : escapeHTML(text);
				return anchor(href, inner);
			} finally {
				linkDepth--;
			}
		},
		image() {
			return '';
		},
		text(token: Tokens.Text | Tokens.Escape) {
			if ('tokens' in token && token.tokens) return this.parser.parseInline(token.tokens);
			if (token.type === 'escape') return token.text;
			const escaped = 'escaped' in token && !!token.escaped;
			if (linkDepth > 0) return escaped ? token.text : escapeHTML(token.text);
			return linkCashtags(token.text, escaped);
		}
	}
});

/** Sanitized HTML for an article body. */
export function render(src: string): string {
	try {
		return marked.parse(src, { async: false });
	} catch {
		return '';
	}
}
