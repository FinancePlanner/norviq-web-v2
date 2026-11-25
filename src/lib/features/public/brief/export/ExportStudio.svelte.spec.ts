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

/** Stubs fetch: the manifest answers `manifestStatus` with `body`, any export answers 200. */
function stubFetch(manifestStatus = 200, body: WebExportManifest = manifest) {
	const f = vi.fn<typeof fetch>((input) => {
		const url = input instanceof Request ? input.url : String(input);
		if (url.includes('/exports.json')) {
			return Promise.resolve(
				manifestStatus === 200
					? Response.json(body)
					: new Response('renderer busy', { status: manifestStatus })
			);
		}
		return Promise.resolve(new Response(new Blob(['png'], { type: 'image/png' })));
	});
	vi.stubGlobal('fetch', f);
	return f;
}

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
	});

	it('keeps a manifest preview that loads', async () => {
		const png =
			'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
		stubFetch(200, {
			...manifest,
			formats: manifest.formats.map((f) => (f.id === 'social' ? { ...f, url: png } : f))
		});
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
		await expect
			.element(page.getByRole('link', { name: pt.exportDownload }))
			.toHaveAttribute('href', png);
	});

	it('shows the PDF page count', async () => {
		stubFetch();
		render(ExportStudio, { ...studio, open: true });

		await page.getByRole('tab', { name: pt.exportPdf }).click();
		await expect.element(page.getByText('4 páginas')).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: pt.exportDownload }))
			.toHaveAttribute('href', fallback.pdf + VERSION);
		const open = page.getByRole('link', { name: pt.exportOpenPdf });
		await expect.element(open).toHaveAttribute('target', '_blank');
		await expect.element(open).toHaveAttribute('rel', 'noopener');
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

	it('closes on Escape and returns focus to the trigger', async () => {
		stubFetch();
		render(ExportTrigger, { href: fallback.social, label: pt.exportOpen, studio });

		const trigger = page.getByRole('link', { name: pt.exportOpen });
		await expect.element(trigger).toHaveAttribute('href', fallback.social);
		await trigger.click();
		const dialog = page.getByRole('dialog', { name: pt.exportTitle });
		await expect.element(dialog).toBeVisible();

		await userEvent.keyboard('{Escape}');
		await expect.element(dialog).not.toBeInTheDocument();
		await expect.element(trigger).toHaveFocus();
	});

	it('fits a 320 px screen', async () => {
		stubFetch();
		await page.viewport(320, 640);
		render(ExportStudio, { ...studio, open: true });

		const dialog = page.getByRole('dialog', { name: pt.exportTitle });
		await expect.element(dialog).toBeVisible();
		for (const name of [pt.exportSocial, pt.exportPdf]) {
			await page.getByRole('tab', { name }).click();
			const el = dialog.element();
			expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth);
			expect(el.getBoundingClientRect().right).toBeLessThanOrEqual(320);
		}
		for (const tab of page.getByRole('tab').elements()) {
			expect(tab.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
		}
	});
});
