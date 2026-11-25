// The Export Studio's pure parts: which URL to use for a format, how to fetch
// one for the share sheet, and what to send to analytics. Client-safe.
import { captureShare } from '#lib/components/norviq/share-links.js';
import type { ExportFormat, WebExportManifest } from './types.js';

/** The manifest's (versioned) URL for a format, else the unversioned fallback. */
export function formatURL(
	m: WebExportManifest | null,
	id: ExportFormat,
	fallback: Record<ExportFormat, string>
): string {
	return m?.formats.find((f) => f.id === id)?.url || fallback[id];
}

/**
 * The export's bytes, for navigator.share. A 404 means the manifest URL was
 * superseded by a newer revision, so it retries the unversioned URL once; any
 * other failure throws.
 */
export async function fetchExport(
	url: string,
	fallbackURL: string,
	f: typeof fetch = fetch
): Promise<Blob> {
	let response = await f(url);
	if (response.status === 404 && fallbackURL && fallbackURL !== url) {
		response = await f(fallbackURL);
	}
	if (!response.ok) throw new Error(`export ${url}: HTTP ${response.status}`);
	return response.blob();
}

/** The file name for an export: /brief/2026-11-20/evening/social.png → norviq-brief-2026-11-20-evening-social.png. */
export function exportFileName(url: string): string {
	const path = url.split(/[?#]/)[0];
	return 'norviq-' + path.split('/').filter(Boolean).join('-');
}

/**
 * Captures market_brief_shared with the page's props plus channel and method.
 * The og image is the link preview, not a shared file, so it is never tracked.
 */
export function trackExport(
	eventProps: string,
	channel: ExportFormat | 'link',
	method: 'download' | 'share' | 'open' | 'copy'
): void {
	if (channel === 'og') return;
	let props: Record<string, unknown> = {};
	try {
		const parsed: unknown = JSON.parse(eventProps || '{}');
		if (parsed && typeof parsed === 'object') props = Object.fromEntries(Object.entries(parsed));
	} catch {
		/* malformed props: capture channel and method alone */
	}
	captureShare('market_brief_shared', { ...props, channel, method });
}
