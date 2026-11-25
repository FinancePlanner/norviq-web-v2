import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
// The app's Tailwind and theme, so sizes in the tests are the real ones.
import '../../../../../routes/layout.css';
import { editionStrings } from '../edition/strings.js';
import ExportStudio, { type StudioProps } from './ExportStudio.svelte';
import ExportTrigger from './ExportTrigger.svelte';
import type { ExportFormat, WebExportManifest } from './types.js';

const BASE = '/brief/2026-11-20/evening';
const LANG = '?lang=pt-PT';
const VERSION = '&rev=2&v=1';
const fallback: Record<ExportFormat, string> = {
	og: BASE + '/og.png' + LANG,
	social: BASE + '/social.png' + LANG,
	story: BASE + '/story.png' + LANG,
	pdf: BASE + '/report.pdf' + LANG
};
const manifest: WebExportManifest = {
	editionId: '2026-11-20-evening',
	revision: 2,
	rendererVersion: 1,
	formats: [
		{ id: 'og', url: fallback.og + VERSION, width: 1200, height: 630, mime: 'image/png' },
		{ id: 'social', url: fallback.social + VERSION, width: 1080, height: 1350, mime: 'image/png' },
		{ id: 'story', url: fallback.story + VERSION, width: 1080, height: 1920, mime: 'image/png' },
		{ id: 'pdf', url: fallback.pdf + VERSION, pages: 4, mime: 'application/pdf' }
	]
};
const pt = editionStrings('pt-PT');
const studio: Omit<StudioProps, 'open'> = {
	exportsURL: BASE + '/exports.json' + LANG,
	fallback,
	copyURL: 'https://www.norviq.org' + BASE + LANG + '&utm_source=copy&utm_medium=share',
	nativeURL: 'https://www.norviq.org' + BASE + LANG + '&utm_source=native&utm_medium=share',
	title: 'O Fecho — 20 nov. 2026',
	eventProps: '{"date":"2026-11-20","lang":"pt-PT","slot":"evening","surface":"page"}',
	text: pt
};
const pageProps = { date: '2026-11-20', lang: 'pt-PT', slot: 'evening', surface: 'page' };

/** Stubs fetch: the manifest answers `manifestStatus` with `body`, any export `exportStatus`. */
function stubFetch(manifestStatus = 200, body: WebExportManifest = manifest, exportStatus = 200) {
	const f = vi.fn<typeof fetch>((input) => {
		const url = input instanceof Request ? input.url : String(input);
		if (url.includes('/exports.json')) {
			return Promise.resolve(
				manifestStatus === 200
					? Response.json(body)
					: new Response('renderer busy', { status: manifestStatus })
			);
		}
		return Promise.resolve(
			exportStatus === 200
				? new Response(new Blob(['png'], { type: 'image/png' }))
				: new Response('renderer busy', { status: exportStatus })
		);
	});
	vi.stubGlobal('fetch', f);
	return f;
}

/** The URLs fetched other than the manifest. */
function exportFetches(f: ReturnType<typeof stubFetch>): string[] {
	return f.mock.calls
		.map(([input]) => (input instanceof Request ? input.url : String(input)))
		.filter((url) => !url.includes('/exports.json'));
}

/** Makes the browser offer file sharing, with `share` as the share sheet. */
function stubShare(share: (data?: ShareData) => Promise<void>) {
	const spy = vi.fn<(data?: ShareData) => Promise<void>>(share);
	const define = (key: 'canShare' | 'share', value: unknown) =>
		Object.defineProperty(navigator, key, { configurable: true, writable: true, value });
	define('canShare', () => true);
	define('share', spy);
	cleanups.push(() => {
		Reflect.deleteProperty(navigator, 'canShare');
		Reflect.deleteProperty(navigator, 'share');
	});
	return spy;
}

const PNG =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
/** A manifest whose social image is a PNG the test browser can load. */
const loadingManifest: WebExportManifest = {
	...manifest,
	formats: manifest.formats.map((f) => (f.id === 'social' ? { ...f, url: PNG } : f))
};

/** Every src an <img> tried to load, recorded before the studio reacts to it. */
function recordImageSources(): string[] {
	const seen: string[] = [];
	const record = (e: Event) => {
		if (e.target instanceof HTMLImageElement) seen.push(e.target.getAttribute('src') ?? '');
	};
	document.addEventListener('load', record, true);
	document.addEventListener('error', record, true);
	cleanups.push(() => {
		document.removeEventListener('load', record, true);
		document.removeEventListener('error', record, true);
	});
	return seen;
}

const cleanups: (() => void)[] = [];

describe('ExportStudio', () => {
	beforeAll(() => {
		// There are no exports behind the test server: block images other than data
		// URLs, so every export preview fails at once, the same way each run, and
		// never reaches the server.
		const csp = document.createElement('meta');
		csp.httpEquiv = 'Content-Security-Policy';
		csp.content = 'img-src data:';
		document.head.appendChild(csp);
	});
	beforeEach(() => {
		delete window.__norviqAnalyticsQueue;
	});
	afterEach(() => {
		cleanups.splice(0).forEach((fn) => fn());
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('shows the four tabs and the social preview from the manifest', async () => {
		const f = stubFetch();
		const seen = recordImageSources();
		render(ExportStudio, { ...studio, open: true });

		const dialog = page.getByRole('dialog', { name: pt.exportTitle });
		await expect.element(dialog).toBeVisible();
		for (const name of [pt.exportSocial, pt.exportStory, pt.exportPdf, pt.exportLink]) {
			await expect.element(page.getByRole('tab', { name })).toBeVisible();
		}
		expect(f).toHaveBeenCalledWith(studio.exportsURL, expect.anything());

		const img = page.getByAltText(pt.exportSocialAlt);
		await expect.element(img).toHaveAttribute('width', '1080');
		await expect.element(img).toHaveAttribute('height', '1350');
		// Images are blocked, so the preview went on to the unversioned URL after this one.
		await expect.poll(() => seen).toContain(fallback.social + VERSION);
	});

	it('falls back to the unversioned preview, then says it is unavailable', async () => {
		stubFetch();
		const seen = recordImageSources();
		render(ExportStudio, { ...studio, open: true });

		await expect.element(page.getByText(pt.exportUnavailable)).toBeVisible();
		expect(seen).toEqual([fallback.social + VERSION, fallback.social]);
		// No empty preview frame above the note.
		const frame = page.getByAltText(pt.exportSocialAlt).element().parentElement;
		expect(frame?.getBoundingClientRect().height).toBe(0);
	});

	it('keeps a manifest preview that loads', async () => {
		const png = PNG;
		stubFetch(200, loadingManifest);
		render(ExportStudio, { ...studio, open: true });

		const img = page.getByAltText(pt.exportSocialAlt);
		await expect
			.poll(() => {
				const el = img.query();
				return el instanceof HTMLImageElement ? el.naturalWidth : 0;
			})
			.toBe(1);
		await expect.element(img).toBeVisible();
		await expect.element(img).toHaveAttribute('src', png);
		expect(page.getByText(pt.exportUnavailable).elements()).toHaveLength(0);
	});

	it('downloads from the unversioned URLs, which a newer revision never supersedes', async () => {
		stubFetch();
		const seen = recordImageSources();
		render(ExportStudio, { ...studio, open: true });

		const download = page.getByRole('link', { name: pt.exportDownload });
		await expect.element(download).toHaveAttribute('href', fallback.social);
		// The preview still uses the manifest's versioned URL.
		await expect.poll(() => seen).toContain(fallback.social + VERSION);

		await page.getByRole('tab', { name: pt.exportStory }).click();
		await expect.element(download).toHaveAttribute('href', fallback.story);

		await page.getByRole('tab', { name: pt.exportPdf }).click();
		await expect.element(page.getByText('4 páginas')).toBeVisible();
		await expect.element(download).toHaveAttribute('href', fallback.pdf);
		await expect
			.element(page.getByRole('link', { name: pt.exportOpenPdf }))
			.toHaveAttribute('href', fallback.pdf);
	});

	it('shares the unversioned image when both previews failed, never the page', async () => {
		const f = stubFetch();
		const share = stubShare(() => Promise.resolve());
		render(ExportStudio, { ...studio, open: true });

		await expect.element(page.getByText(pt.exportUnavailable)).toBeVisible();
		await page.getByRole('button', { name: pt.exportShare }).click();
		await expect.poll(() => share.mock.calls.length).toBe(1);

		const fetched = exportFetches(f);
		expect(fetched).toContain(fallback.social);
		expect(
			fetched.every((url) => url === fallback.social || url === fallback.social + VERSION)
		).toBe(true);
		expect(share.mock.calls[0][0]?.files?.map((file) => file.name)).toEqual([
			'norviq-brief-2026-11-20-evening-social.png'
		]);
		expect(window.__norviqAnalyticsQueue).toEqual([
			['market_brief_shared', { ...pageProps, channel: 'social', method: 'share' }]
		]);
	});

	it('says the export is unavailable when it cannot be fetched to share', async () => {
		stubFetch(200, loadingManifest, 503);
		const share = stubShare(() => Promise.resolve());
		render(ExportStudio, { ...studio, open: true });

		await page.getByRole('button', { name: pt.exportShare }).click();
		await expect.element(page.getByText(pt.exportUnavailable)).toBeVisible();
		expect(share).not.toHaveBeenCalled();
		expect(window.__norviqAnalyticsQueue).toBeUndefined();
	});

	it('does not track a share the user cancels', async () => {
		stubFetch(200, loadingManifest);
		const share = stubShare(() => Promise.reject(new DOMException('Share canceled', 'AbortError')));
		render(ExportStudio, { ...studio, open: true });

		await page.getByRole('button', { name: pt.exportShare }).click();
		await expect.poll(() => share.mock.calls.length).toBe(1);
		expect(page.getByText(pt.exportUnavailable).elements()).toHaveLength(0);
		expect(window.__norviqAnalyticsQueue).toBeUndefined();
	});

	it('shows the PDF page count', async () => {
		stubFetch();
		render(ExportStudio, { ...studio, open: true });

		await page.getByRole('tab', { name: pt.exportPdf }).click();
		await expect.element(page.getByText('4 páginas')).toBeVisible();
		const open = page.getByRole('link', { name: pt.exportOpenPdf });
		await expect.element(open).toHaveAttribute('target', '_blank');
		await expect.element(open).toHaveAttribute('rel', 'noopener');
	});

	it('says 1 página for a one-page PDF', async () => {
		stubFetch(200, {
			...manifest,
			formats: manifest.formats.map((f) => (f.id === 'pdf' ? { ...f, pages: 1 } : f))
		});
		render(ExportStudio, { ...studio, open: true });

		await page.getByRole('tab', { name: pt.exportPdf }).click();
		await expect.element(page.getByText('1 página', { exact: true })).toBeVisible();
	});

	it('renders without a manifest', async () => {
		stubFetch(503);
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
		render(ExportStudio, { ...studio, open: true });

		await expect
			.element(page.getByAltText(pt.exportSocialAlt))
			.toHaveAttribute('src', fallback.social);

		await page.getByRole('tab', { name: pt.exportPdf }).click();
		await expect
			.element(page.getByRole('link', { name: pt.exportDownload }))
			.toHaveAttribute('href', fallback.pdf);
		expect(page.getByText(/páginas/).elements()).toHaveLength(0);

		await page.getByRole('tab', { name: pt.exportLink }).click();
		await page.getByRole('button', { name: pt.exportCopyLink }).click();
		await expect.element(page.getByRole('button', { name: pt.exportCopied })).toBeVisible();
		expect(writeText).toHaveBeenCalledWith(studio.copyURL);
		expect(window.__norviqAnalyticsQueue).toEqual([
			['market_brief_shared', { ...pageProps, channel: 'link', method: 'copy' }]
		]);
	});

	it('tracks a download', async () => {
		stubFetch();
		render(ExportStudio, { ...studio, open: true });
		await page.getByRole('tab', { name: pt.exportStory }).click();

		// Keep the browser from actually downloading; the studio's own click handler still runs.
		const stop = (e: Event) => e.preventDefault();
		document.addEventListener('click', stop, true);
		cleanups.push(() => document.removeEventListener('click', stop, true));
		await page.getByRole('link', { name: pt.exportDownload }).click();

		expect(window.__norviqAnalyticsQueue).toEqual([
			['market_brief_shared', { ...pageProps, channel: 'story', method: 'download' }]
		]);
	});

	it('moves between tabs with the arrow, Home and End keys', async () => {
		stubFetch();
		render(ExportStudio, { ...studio, open: true });

		const tab = (name: string) => page.getByRole('tab', { name });
		await expect.element(tab(pt.exportSocial)).toHaveAttribute('aria-selected', 'true');
		expect(page.getByRole('tabpanel').elements()).toHaveLength(1);
		tab(pt.exportSocial).element().focus();

		const steps: [string, string][] = [
			['{ArrowRight}', pt.exportStory],
			['{End}', pt.exportLink],
			['{ArrowRight}', pt.exportSocial],
			['{ArrowLeft}', pt.exportLink],
			['{Home}', pt.exportSocial]
		];
		for (const [key, name] of steps) {
			await userEvent.keyboard(key);
			await expect.element(tab(name)).toHaveFocus();
			await expect.element(tab(name)).toHaveAttribute('aria-selected', 'true');
			await expect.element(page.getByRole('tabpanel', { name })).toBeVisible();
		}
		// Only the selected tab is in the tab order.
		expect(
			page
				.getByRole('tab')
				.elements()
				.map((el) => el.tabIndex)
		).toEqual([0, -1, -1, -1]);
	});

	it('closes on Escape and returns focus to the trigger', async () => {
		stubFetch();
		render(ExportTrigger, { href: fallback.social, label: pt.exportOpen, studio });

		const trigger = page.getByRole('link', { name: pt.exportOpen });
		await expect.element(trigger).toHaveAttribute('href', fallback.social);
		// Crawlers must not follow it into a cold render.
		await expect.element(trigger).toHaveAttribute('rel', 'nofollow');
		await trigger.click();
		const dialog = page.getByRole('dialog', { name: pt.exportTitle });
		await expect.element(dialog).toBeVisible();

		await userEvent.keyboard('{Escape}');
		await expect.element(dialog).not.toBeInTheDocument();
		await expect.element(trigger).toHaveFocus();
	});

	it('fits a 320 px screen', async () => {
		// Previews the test browser can load, at the formats' aspect ratios.
		const png = (w: number, h: number) => {
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			return canvas.toDataURL('image/png');
		};
		const urls: Partial<Record<ExportFormat, string>> = {
			og: png(120, 63),
			social: png(108, 135),
			story: png(108, 192)
		};
		stubFetch(200, {
			...manifest,
			formats: manifest.formats.map((f) => ({ ...f, url: urls[f.id] ?? f.url }))
		});
		await page.viewport(320, 640);
		render(ExportStudio, { ...studio, open: true });

		const dialog = page.getByRole('dialog', { name: pt.exportTitle });
		await expect.element(dialog).toBeVisible();
		const fitsScreen = () => {
			const el = dialog.element();
			expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth);
			expect(el.getBoundingClientRect().right).toBeLessThanOrEqual(320);
		};
		/** Frame height and the height of the image drawn in it (object-fit: contain), once loaded. */
		const heights = (alt: string): [number, number] => {
			const el = page.getByAltText(alt).query();
			if (!(el instanceof HTMLImageElement) || !el.naturalWidth) return [0, -1];
			const scale = Math.min(el.clientWidth / el.naturalWidth, el.clientHeight / el.naturalHeight);
			const frame = el.parentElement?.getBoundingClientRect().height ?? 0;
			return [frame, el.naturalHeight * scale];
		};
		const previews: [string, string][] = [
			[pt.exportSocial, pt.exportSocialAlt],
			[pt.exportStory, pt.exportStoryAlt],
			[pt.exportLink, pt.exportLinkAlt]
		];
		for (const [name, alt] of previews) {
			await page.getByRole('tab', { name }).click();
			// The frame is exactly as tall as the image drawn in it.
			await expect
				.poll(() => {
					const [frame, drawn] = heights(alt);
					return frame > 0 && Math.abs(frame - drawn) <= 1;
				})
				.toBe(true);
			fitsScreen();
		}
		await page.getByRole('tab', { name: pt.exportPdf }).click();
		fitsScreen();
		for (const tab of page.getByRole('tab').elements()) {
			expect(tab.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
		}
	});
});
