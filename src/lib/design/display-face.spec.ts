// The server preloads the display face (Brygada 1918) only on routes that show
// it above the fold (hooks.server.ts). usesDisplayFace() is a hand-kept list, so
// this test derives the answer from the route sources and requires the two to
// agree on every route: a new Document page missing from the list fails here.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DISPLAY_FACE_HREF, usesDisplayFace, withDisplayFacePreload } from './display-face.js';

const ROUTES = fileURLToPath(new URL('../../routes/', import.meta.url));
const read = (path: string) =>
	readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), 'utf8');

function pages(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return pages(path);
		return name === '+page.svelte' ? [path] : [];
	});
}

/** src/routes/(app)/settings/+page.svelte -> /(app)/settings */
const routeId = (file: string) => '/' + relative(ROUTES, file).split(sep).slice(0, -1).join('/');

/**
 * Where the serif renders: the Overview greeting, the brief, and a page title
 * (.vigil-page-title, from ModernPageHeader) inside the Document grammar.
 * DocumentPage wraps SettingsShell, which wraps ModernPageHeader.
 */
function showsDisplayFace(id: string, source: string): boolean {
	if (id === '/(app)/dashboard') return true;
	if (source.includes('BriefPage')) return true;
	if (source.includes('DocumentPage')) return true;
	return source.includes('vigil-document-page') && /ModernPageHeader|SettingsShell/.test(source);
}

describe('usesDisplayFace', () => {
	const all = pages(ROUTES).map((file) => ({
		id: routeId(file),
		source: readFileSync(file, 'utf8')
	}));

	it('matches every route that shows the display face, and no other', () => {
		expect(all.length).toBeGreaterThan(100);
		const wrong = all
			.filter(({ id, source }) => usesDisplayFace(id) !== showsDisplayFace(id, source))
			.map(({ id, source }) => `${id} (shows: ${showsDisplayFace(id, source)})`);
		expect(wrong).toEqual([]);
	});

	it('covers the Overview, a settings page and the brief, but not the landing or a deck page', () => {
		expect(usesDisplayFace('/(app)/dashboard')).toBe(true);
		expect(usesDisplayFace('/(app)/settings/profile')).toBe(true);
		expect(usesDisplayFace('/(public)/brief/[date]/[slot]')).toBe(true);
		expect(usesDisplayFace('/(public)')).toBe(false);
		expect(usesDisplayFace('/(app)/portfolio')).toBe(false);
		expect(usesDisplayFace('/(app)/portfolio/one-page')).toBe(false);
		expect(usesDisplayFace(null)).toBe(false);
	});

	it('names the self-hosted woff2', () => {
		expect(DISPLAY_FACE_HREF).toBe('/static/fonts/brygada-1918-latin-wght-normal.woff2');
	});
});

describe('withDisplayFacePreload', () => {
	const link = `<link rel="preload" href="${DISPLAY_FACE_HREF}" as="font" type="font/woff2" crossorigin>`;

	it('adds one font preload at the end of the head', () => {
		const html = '<html><head><title>x</title></head><body></body></html>';
		expect(withDisplayFacePreload(html)).toBe(
			`<html><head><title>x</title>${link}</head><body></body></html>`
		);
	});

	it('leaves a chunk without a head alone (streamed body chunks)', () => {
		expect(withDisplayFacePreload('<div>later chunk</div>')).toBe('<div>later chunk</div>');
	});

	it('is what the server hook does on display-face routes, and the layouts do not repeat it', () => {
		const hook = read('hooks.server.ts');
		expect(hook).toContain('usesDisplayFace(event.route.id)');
		expect(hook).toContain('withDisplayFacePreload(');
		for (const layout of ['routes/(app)/+layout.svelte', 'routes/(public)/+layout.svelte'])
			expect(read(layout), layout).not.toContain('brygada');
	});
});
