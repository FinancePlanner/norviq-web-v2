// externalNewsRedirectURL from norviq-web internal/handlers/news_view.go:
// url.Parse, require an http(s) scheme and a host, drop the fragment and any
// userinfo, then url.String(). Done by hand rather than with WHATWG URL,
// which would lower-case the host, add a trailing "/" and accept "https:host",
// none of which Go does.

// Characters url.(*URL).EscapedPath keeps verbatim (validEncoded + unreserved).
const PATH_OK = /^[A-Za-z0-9\-_.~!$&'()*+,;=:@[\]/%]*$/;

/** Percent-encodes what Go's escape(path, encodePath) would, keeping %XX. */
function escapePath(path: string): string {
	if (PATH_OK.test(path)) return path;
	let out = '';
	for (const ch of path) {
		if (/[A-Za-z0-9\-_.~!$&'()*+,;=:@[\]/%]/.test(ch)) out += ch;
		else for (const byte of new TextEncoder().encode(ch)) out += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
	}
	return out;
}

export function externalNewsRedirectURL(raw: string): string | null {
	// url.Parse rejects ASCII control characters anywhere.
	// eslint-disable-next-line no-control-regex
	if (/[\x00-\x1f\x7f]/.test(raw)) return null;
	const hash = raw.indexOf('#');
	const withoutFragment = hash >= 0 ? raw.slice(0, hash) : raw;
	const m = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/?]*)([^?]*)(\?.*)?$/.exec(withoutFragment);
	if (!m) return null;
	const scheme = m[1].toLowerCase();
	if (scheme !== 'http' && scheme !== 'https') return null;
	const authority = m[2];
	const at = authority.lastIndexOf('@');
	const host = at >= 0 ? authority.slice(at + 1) : authority;
	if (host === '') return null;
	const path = m[3];
	// url.Parse fails on a malformed %-escape in the path.
	if (/%(?![0-9A-Fa-f]{2})/.test(path)) return null;
	const query = m[4] ?? '';
	const rebuilt = `${scheme}://${host}${escapePath(path)}${query}`;
	// Host validation (url.Parse rejects spaces and the like in the host too).
	try {
		new URL(rebuilt);
	} catch {
		return null;
	}
	return rebuilt;
}
