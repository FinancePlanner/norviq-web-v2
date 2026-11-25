import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportFileName, fetchExport, formatURL, trackExport } from './studio.js';
import type { ExportFormat, WebExportManifest } from './types.js';

const BASE = '/brief/2026-11-20/evening';
const fallback: Record<ExportFormat, string> = {
	og: BASE + '/og.png',
	social: BASE + '/social.png',
	story: BASE + '/story.png',
	pdf: BASE + '/report.pdf'
};
const manifest: WebExportManifest = {
	editionId: '2026-11-20-evening',
	revision: 2,
	rendererVersion: 1,
	formats: [
		{
			id: 'social',
			url: BASE + '/social.png?rev=2&v=1',
			width: 1080,
			height: 1350,
			mime: 'image/png'
		},
		{ id: 'pdf', url: BASE + '/report.pdf?rev=2&v=1', pages: 4, mime: 'application/pdf' }
	]
};

function fakeFetch(statuses: Record<string, number>) {
	return vi.fn<typeof fetch>((input) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		const status = statuses[url] ?? 500;
		return Promise.resolve(new Response(status === 200 ? 'png:' + url : 'x', { status }));
	});
}

describe('studio', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('formatURL prefers the manifest and falls back per format', () => {
		expect(formatURL(manifest, 'social', fallback)).toBe(BASE + '/social.png?rev=2&v=1');
		expect(formatURL(manifest, 'pdf', fallback)).toBe(BASE + '/report.pdf?rev=2&v=1');
		expect(formatURL(manifest, 'story', fallback)).toBe(fallback.story);
		expect(formatURL(null, 'social', fallback)).toBe(fallback.social);
	});

	it('falls back to the unversioned URL on 404', async () => {
		const f = fakeFetch({ [BASE + '/social.png?rev=2&v=1']: 404, [BASE + '/social.png']: 200 });
		const blob = await fetchExport(BASE + '/social.png?rev=2&v=1', fallback.social, f);
		expect(await blob.text()).toBe('png:' + BASE + '/social.png');
		expect(f).toHaveBeenCalledTimes(2);
	});

	it('throws on a 503 without retrying', async () => {
		const f = fakeFetch({ [BASE + '/social.png?rev=2&v=1']: 503, [BASE + '/social.png']: 200 });
		await expect(fetchExport(BASE + '/social.png?rev=2&v=1', fallback.social, f)).rejects.toThrow(
			'503'
		);
		expect(f).toHaveBeenCalledTimes(1);
	});

	it('names the file after the edition and format', () => {
		expect(exportFileName(BASE + '/social.png?lang=pt-PT&rev=2&v=1')).toBe(
			'norviq-brief-2026-11-20-evening-social.png'
		);
		expect(exportFileName(fallback.pdf)).toBe('norviq-brief-2026-11-20-evening-report.pdf');
	});

	it('trackExport sends channel and method with the page props', () => {
		const win: { __norviqAnalyticsQueue?: unknown[] } = {};
		vi.stubGlobal('window', win);
		const props = '{"date":"2026-11-20","lang":"en","slot":"evening","surface":"page"}';
		trackExport(props, 'pdf', 'download');
		trackExport(props, 'og', 'download');
		expect(win.__norviqAnalyticsQueue).toEqual([
			[
				'market_brief_shared',
				{
					slot: 'evening',
					date: '2026-11-20',
					lang: 'en',
					surface: 'page',
					channel: 'pdf',
					method: 'download'
				}
			]
		]);
	});
});
