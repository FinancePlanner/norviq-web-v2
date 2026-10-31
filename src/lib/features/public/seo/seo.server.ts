// Port of norviq-web internal/server/seo.go, app_links.go and security_txt.go:
// the machine files at the site root. Byte-for-byte the same bodies and
// headers as Go.
import type { RequestEvent } from '@sveltejs/kit';
import { config, publicPagesEnabled, DEFAULT_IOS_APP_STORE_URL } from '#lib/server/env.js';
import { all as publicSymbols } from '#lib/publicsymbols.js';
import { OperatorEmail, WebsiteURL } from '../legal/operator.js';
import { DiscordURL } from '../landing/landing.js';

// The only routes a crawler should index. Everything under the app shell
// redirects to /login unauthenticated, so listing it would only produce
// soft-404s in Search Console.
const publicSitemapPaths = ['/', '/login', '/signup', '/privacy', '/terms', '/legal', '/security'];

/** Go's publicBase: PUBLIC_BASE_URL without a trailing slash (defaults to localhost, as in Go). */
export function publicBase(): string {
	return config().publicBaseURL;
}

/** Go falls back to the request host when PUBLIC_BASE_URL is unset (sitemap, llms.txt). */
function baseOrRequest(event: Pick<RequestEvent, 'url' | 'request'>): string {
	const base = publicBase();
	if (base) return base;
	const forwarded = event.request.headers.get('x-forwarded-proto') ?? '';
	const scheme =
		event.url.protocol === 'https:' || forwarded.startsWith('https') ? 'https' : 'http';
	return scheme + '://' + event.url.host;
}

const textHeaders = {
	'Content-Type': 'text/plain; charset=utf-8',
	'Cache-Control': 'public, max-age=86400'
};

export function robotsTxt(): Response {
	const cfg = config();
	let b = 'User-agent: *\n';
	b += 'Allow: /\n';
	// Redundant against the blanket Allow, but the ticker pages are the only
	// thing here a crawler is meant to spend its budget on, and the line
	// disappears with the feature rather than pointing at 404s.
	if (publicPagesEnabled(cfg)) b += 'Allow: /s/\n';
	for (const p of [
		'/dashboard',
		'/portfolio',
		'/expenses',
		'/settings',
		'/onboarding',
		'/auth/',
		'/oauth/',
		'/billing',
		'/runtime-config.js'
	]) {
		b += 'Disallow: ' + p + '\n';
	}
	const base = publicBase();
	if (base) {
		b += 'Sitemap: ' + base + '/sitemap.xml\n';
		b += '# Product summary for AI crawlers: ' + base + '/llms.txt\n';
	}
	return new Response(b, { headers: textHeaders });
}

/** encoding/xml escaping of character data (EscapeText). */
function xmlEscape(s: string): string {
	return s.replace(
		/[&<>"'\t\n\r]/g,
		(c) =>
			({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&#34;',
				"'": '&#39;',
				'\t': '&#x9;',
				'\n': '&#xA;',
				'\r': '&#xD;'
			})[c]!
	);
}

/** extra lists further public paths (articles, market brief). */
export function sitemapXML(
	event: Pick<RequestEvent, 'url' | 'request'>,
	extra: string[]
): Response {
	const base = baseOrRequest(event);
	const locs = publicSitemapPaths.map((p) => base + p);
	// Only when the token is configured: without it /s/ answers 404, and a
	// sitemap full of soft-404s is worse than no ticker pages at all.
	if (publicPagesEnabled(config()))
		for (const symbol of publicSymbols()) locs.push(base + '/s/' + symbol);
	for (const p of extra) locs.push(base + p);
	// xml.Header + xml.NewEncoder(w).Encode(set): one line, no trailing newline.
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
		locs.map((loc) => '<url><loc>' + xmlEscape(loc) + '</loc></url>').join('') +
		'</urlset>';
	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=86400'
		}
	});
}

export function llmsTxt(event: Pick<RequestEvent, 'url' | 'request'>): Response {
	const base = baseOrRequest(event);
	const appStore = config().iosAppStoreURL || DEFAULT_IOS_APP_STORE_URL;
	let b = '# Norviq\n\n';
	b +=
		'Norviq is professional stock planning and portfolio intelligence for disciplined investors, on iPhone and the web: portfolio tracking, position sizing, budgets, and AI-assisted insights with MCP integrations.\n\n';
	b += '- Website: ' + base + '/\n';
	b += '- Sign up: ' + base + '/signup\n';
	b += '- App Store: ' + appStore + '\n';
	b += '- Privacy: ' + base + '/privacy\n';
	b += '- Terms: ' + base + '/terms\n';
	b += '- Legal notice: ' + base + '/legal\n';
	b += '- Security: ' + base + '/security\n';
	b += '- X: https://x.com/NorviqPlanner\n';
	b += '- Discord: ' + DiscordURL + '\n\n';
	b +=
		'The product app (dashboard, portfolio, expenses) is behind authentication and should not be indexed.\n';
	return new Response(b, { headers: textHeaders });
}

// Lets the Norviq iOS app (team 84X9WYBF36, bundle facorreia.financeplan)
// open friend invite links, https://norviq.org/i/{code}, and group invite
// links, https://norviq.org/g/{code}, directly. Both hosts must serve this
// with a 200, as JSON, and without a redirect.
const appleAppSiteAssociation = `{
  "applinks": {
    "details": [
      {
        "appIDs": ["84X9WYBF36.facorreia.financeplan"],
        "components": [
          { "/": "/i/*", "comment": "Friend invite links" },
          { "/": "/g/*", "comment": "Group invite links" }
        ]
      }
    ]
  }
}
`;

export function appleAppSiteAssociationResponse(): Response {
	return new Response(appleAppSiteAssociation, {
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
	});
}

/**
 * /.well-known/security.txt (RFC 9116). Expires is computed per request, just
 * under a year ahead (midnight UTC today + 364 days).
 */
export function securityTxt(now = new Date()): Response {
	const base = publicBase() || WebsiteURL;
	const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 364);
	const expires = new Date(day).toISOString().replace(/\.\d{3}Z$/, 'Z');
	let b = 'Contact: mailto:' + OperatorEmail + '\n';
	b += 'Expires: ' + expires + '\n';
	b += 'Preferred-Languages: en, pt\n';
	b += 'Canonical: ' + base + '/.well-known/security.txt\n';
	b += 'Policy: ' + base + '/security\n';
	return new Response(b, { headers: textHeaders });
}
