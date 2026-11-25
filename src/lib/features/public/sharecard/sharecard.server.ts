// Port of norviq-web internal/sharecard (sharecard.go): the articles' social
// images, the 1200×630 og:image and the 1080×1350 portrait card for Instagram. Same layout, sizes, fonts (Go
// Regular / Go Bold) and text fitting as Go; pixels differ by rasteriser
// anti-aliasing and PNG compression, and the colours by the 2026-10-30
// Precision palette below.
import regularTTF from './fonts/go-regular.ttf?inline';
import boldTTF from './fonts/go-bold.ttf?inline';
import { Canvas, type RGB } from './raster.js';
import { Face, TTFont } from './ttf.js';

export const Disclaimer = 'User-generated opinion. Not investment advice.';

export interface Format {
	width: number;
	height: number;
	bullets: boolean;
}

export const OG: Format = { width: 1200, height: 630, bullets: false };
export const Instagram: Format = { width: 1080, height: 1350, bullets: true };

function dataURLBytes(url: string): Uint8Array {
	const b64 = url.slice(url.indexOf(',') + 1);
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

let fonts: { regular: TTFont; bold: TTFont } | null = null;
function loadFonts() {
	fonts ??= {
		regular: new TTFont(dataURLBytes(regularTTF)),
		bold: new TTFont(dataURLBytes(boldTTF))
	};
	return fonts;
}
const face = (f: TTFont, size: number) => new Face(f, size);

// Precision identity (docs/precision-identity.md), dark scope. Gold is the
// brand accent only.
const background: RGB = [0x0a, 0x10, 0x1a]; // Obsidian
const foreground: RGB = [0xe9, 0xe9, 0xe5]; // Platinum
const muted: RGB = [0x9d, 0xa9, 0xb8]; // Muted Silver
const accent: RGB = [0xd8, 0xb4, 0x77]; // Champagne Gold

const maxTitleRunes = 200;
const maxBulletRunes = 300;
const maxBullets = 3;
const maxTickers = 5;
const maxSmallRunes = 80;
const bulletTextLines = 3;

const truncRunes = (s: string, n: number) => {
	const r = Array.from(s);
	return r.length <= n ? s : r.slice(0, n).join('');
};
const fields = (s: string) => s.split(/\s+/).filter(Boolean);
/** strings.TrimRight(s, cutset) for a set of single characters. */
const trimRight = (s: string, cut: string) => {
	const r = Array.from(s);
	while (r.length && cut.includes(r[r.length - 1])) r.pop();
	return r.join('');
};

function ellipsize(f: Face, s: string, width: number): string {
	const runes = Array.from(s);
	let lo = 0;
	let hi = runes.length;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (f.measure(runes.slice(0, mid).join('') + '…') <= width) lo = mid;
		else hi = mid - 1;
	}
	return trimRight(runes.slice(0, lo).join(''), ' ') + '…';
}

function fit(f: Face, s: string, width: number): string {
	return f.measure(s) <= width ? s : ellipsize(f, s, width);
}

/** wrap: at most maxLines lines no wider than width; a cut ends in "…". */
function wrap(f: Face, s: string, width: number, maxLines: number): string[] {
	const lines: string[] = [];
	let current = '';
	for (const word of fields(s)) {
		const candidate = current ? current + ' ' + word : word;
		if (!current || f.measure(candidate) <= width) {
			current = candidate;
			continue;
		}
		if (lines.length === maxLines - 1) return [...lines, ellipsize(f, candidate, width)];
		lines.push(fit(f, current, width));
		current = word;
	}
	if (current) lines.push(fit(f, current, width));
	return lines;
}

interface BulletLine {
	text: string;
	y: number;
	first: boolean;
}

function layoutBullets(
	f: Face,
	bullets: string[],
	width: number,
	y: number,
	limit: number,
	gap: number,
	step: number,
	maxLines: number
): BulletLine[] {
	const out: BulletLine[] = [];
	let cut = false;
	outer: for (const b of bullets) {
		y += gap;
		const lines = wrap(f, b, width, maxLines);
		for (let i = 0; i < lines.length; i++) {
			if (y + step > limit) {
				cut = true;
				break outer;
			}
			y += step;
			out.push({ text: lines[i], y, first: i === 0 });
		}
	}
	if (cut && out.length > 0) {
		const last = out[out.length - 1];
		if (!last.text.endsWith('…')) last.text = fit(f, last.text + '…', width);
	}
	return out;
}

// MARK: - Article card (sharecard.go)

export interface Card {
	title: string;
	tickers: string[];
	bullets: string[];
	author: string;
	date: string;
	shortURL: string;
}

export async function render(input: Card, f: Format): Promise<Uint8Array> {
	const { regular, bold } = loadFonts();
	const c: Card = {
		title: truncRunes(input.title, maxTitleRunes),
		author: truncRunes(input.author, maxSmallRunes),
		date: truncRunes(input.date, maxSmallRunes),
		shortURL: truncRunes(input.shortURL, maxSmallRunes),
		tickers: input.tickers.slice(0, maxTickers).map((t) => truncRunes(t, maxSmallRunes)),
		bullets: input.bullets.slice(0, maxBullets).map((b) => truncRunes(b, maxBulletRunes))
	};
	const img = new Canvas(f.width, f.height, background);
	const s = f.width / 1200;
	const px = (v: number) => Math.trunc(v * s);
	const pad = px(80);
	const width = f.width - 2 * pad;
	const footer = f.height - pad;

	let y = pad + px(30);
	img.drawText(face(bold, 34 * s), pad, y, 'NORVIQ', accent);
	if (c.tickers.length > 0) {
		y += px(70);
		const tickerFace = face(bold, 38 * s);
		img.drawText(tickerFace, pad, y, fit(tickerFace, '$' + c.tickers.join('  $'), width), accent);
	}
	const [titleSize, titleLines] = f.bullets ? [66 * s, 4] : [60 * s, 3];
	const titleFace = face(bold, titleSize);
	y += px(20);
	for (const line of wrap(titleFace, c.title, width, titleLines)) {
		y += Math.trunc(titleSize * 1.2);
		img.drawText(titleFace, pad, y, line, foreground);
	}
	if (f.bullets && c.bullets.length > 0) {
		const bulletFace = face(regular, 38 * s);
		const indent = px(44);
		for (const l of layoutBullets(
			bulletFace,
			c.bullets,
			width - indent,
			y + px(30),
			footer - px(190),
			px(20),
			px(52),
			bulletTextLines
		)) {
			if (l.first) img.drawText(bulletFace, pad, l.y, '•', accent);
			img.drawText(bulletFace, pad + indent, l.y, l.text, foreground);
		}
	}
	if (c.shortURL) {
		const urlFace = face(bold, 32 * s);
		img.drawText(urlFace, pad, footer - px(100), fit(urlFace, c.shortURL, width), accent);
	}
	let byline = c.author;
	if (c.date) byline = (byline ? byline + ' · ' : '') + c.date;
	const bylineFace = face(regular, 32 * s);
	img.drawText(bylineFace, pad, footer - px(50), fit(bylineFace, byline, width), foreground);
	img.drawText(face(regular, 26 * s), pad, footer, Disclaimer, muted);
	return img.png();
}

// MARK: - Image cache (one per isolate, like Go's publicPageCache)

const IMAGE_TTL = 15 * 60_000;
const IMAGE_CACHE_MAX = 256;
const images = new Map<string, { png: Uint8Array; expires: number }>();
const pending = new Map<string, Promise<Uint8Array>>();

/** Do: the cached PNG for key, rendering it once however many callers wait. Errors are not cached. */
export async function cachedImage(
	key: string,
	make: () => Promise<Uint8Array>
): Promise<Uint8Array> {
	const hit = images.get(key);
	if (hit && Date.now() < hit.expires) return hit.png;
	let p = pending.get(key);
	if (!p) {
		p = make().finally(() => pending.delete(key));
		pending.set(key, p);
	}
	const png = await p;
	if (!images.has(key) && images.size >= IMAGE_CACHE_MAX) {
		const now = Date.now();
		for (const [k, e] of images) if (now >= e.expires) images.delete(k);
	}
	if (images.size < IMAGE_CACHE_MAX || images.has(key))
		images.set(key, { png, expires: Date.now() + IMAGE_TTL });
	return png;
}
