// Port of norviq-web internal/sharecard (sharecard.go, brief.go): the
// articles' and the market brief's social images, the 1200×630 og:image and
// the 1080×1350 portrait card for Instagram. Same layout, sizes, fonts (Go
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
// brand accent only; direction keeps its own gain/loss pair and its arrow.
const background: RGB = [0x0a, 0x10, 0x1a]; // Obsidian
const foreground: RGB = [0xe9, 0xe9, 0xe5]; // Platinum
const muted: RGB = [0x9d, 0xa9, 0xb8]; // Muted Silver
const accent: RGB = [0xd8, 0xb4, 0x77]; // Champagne Gold
const upColor: RGB = [0x42, 0xb8, 0x94]; // gain
const downColor: RGB = [0xe1, 0x6d, 0x75]; // loss
const rule: RGB = [0x34, 0x42, 0x58]; // Steel Slate
const regionBG: RGB = [0x1b, 0x29, 0x40]; // Armor Blue

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

// MARK: - Market brief card (brief.go)

export const Flat = 0;
export const Up = 1;
export const Down = 2;

export interface BriefRow {
	region: string;
	name: string;
	level: string;
	change: string;
	direction: number;
}

export interface BriefCard {
	title: string;
	date: string;
	rows: BriefRow[];
	items: string[];
	shortURL: string;
	disclaimer: string;
}

const maxBriefRows = 6;
const maxBriefItems = 3;
const maxBriefRowRunes = 40;
const maxBriefItemRunes = 400;

/** RegionCode: a flag emoji ("🇩🇪") as its two-letter code ("DE"); "" otherwise. */
export function regionCode(flag: string): string {
	const runes = Array.from(flag.trim());
	if (runes.length !== 2) return '';
	let out = '';
	for (const r of runes) {
		const cp = r.codePointAt(0)!;
		if (cp < 0x1f1e6 || cp > 0x1f1ff) return '';
		out += String.fromCharCode(65 + cp - 0x1f1e6);
	}
	return out;
}

const isVariationSelector = (cp: number) =>
	(cp >= 0xfe00 && cp <= 0xfe0f) ||
	(cp >= 0xe0100 && cp <= 0xe01ef) ||
	(cp >= 0x180b && cp <= 0x180d) ||
	cp === 0x180f;

/** drawable: drops what the Go fonts cannot draw (emoji, mostly) and collapses the gaps. */
function drawable(s: string): string {
	const { regular } = loadFonts();
	let b = '';
	for (const ch of s) {
		const cp = ch.codePointAt(0)!;
		if (/\s/u.test(ch)) {
			b += ' ';
			continue;
		}
		if (isVariationSelector(cp) || cp === 0x200d) continue;
		if (regular.glyphIndex(cp) === 0) continue;
		b += ch;
	}
	return fields(b).join(' ');
}

function boundBrief(c: BriefCard): BriefCard {
	const items: string[] = [];
	for (const raw of c.items) {
		if (items.length === maxBriefItems) break;
		const it = drawable(truncRunes(raw, maxBriefItemRunes));
		if (it) items.push(it);
	}
	return {
		title: drawable(truncRunes(c.title, maxTitleRunes)),
		date: drawable(truncRunes(c.date, maxSmallRunes)),
		shortURL: drawable(truncRunes(c.shortURL, maxSmallRunes)),
		disclaimer: drawable(truncRunes(c.disclaimer, maxBulletRunes)),
		rows: c.rows.slice(0, maxBriefRows).map((r) => ({
			region: drawable(truncRunes(r.region, 3)),
			name: drawable(truncRunes(r.name, maxBriefRowRunes)),
			level: drawable(truncRunes(r.level, maxBriefRowRunes)),
			change: drawable(truncRunes(r.change, maxBriefRowRunes)),
			direction: r.direction
		})),
		items
	};
}

/** changeLabel: "▲ +0.77%", "▼ −0.77%" or "0.00%". */
function changeLabel(change: string, d: number): [string, RGB] {
	let bare = change.trim();
	while (bare && '+-−– '.includes(bare[0])) bare = bare.slice(1);
	if (d === Up) return ['▲ +' + bare, upColor];
	if (d === Down) return ['▼ −' + bare, downColor];
	return [bare, muted];
}

interface BriefLayout {
	pad: number;
	brandSize: number;
	dateSize: number;
	titleSize: number;
	titleLines: number;
	rowSize: number;
	regionSize: number;
	rowStep: number;
	itemSize: number;
	itemStep: number;
	itemGap: number;
	itemLines: number;
	urlSize: number;
	disclaimerSize: number;
	disclaimerLines: number;
	portrait: boolean;
	columnGap: number;
	leftColumnMin: number;
}

function layoutFor(f: Format): BriefLayout {
	if (f.height > f.width) {
		return {
			pad: 72,
			brandSize: 32,
			dateSize: 30,
			titleSize: 64,
			titleLines: 2,
			rowSize: 34,
			regionSize: 24,
			rowStep: 62,
			itemSize: 33,
			itemStep: 45,
			itemGap: 26,
			itemLines: 3,
			urlSize: 32,
			disclaimerSize: 24,
			disclaimerLines: 2,
			portrait: true,
			columnGap: 0,
			leftColumnMin: 0
		};
	}
	return {
		pad: 60,
		brandSize: 26,
		dateSize: 26,
		titleSize: 50,
		titleLines: 1,
		rowSize: 25,
		regionSize: 18,
		rowStep: 44,
		itemSize: 24,
		itemStep: 31,
		itemGap: 14,
		itemLines: 3,
		urlSize: 24,
		disclaimerSize: 19,
		disclaimerLines: 1,
		portrait: false,
		columnGap: 44,
		leftColumnMin: 600
	};
}

const int = Math.trunc;

function drawBriefRows(
	img: Canvas,
	l: BriefLayout,
	rows: BriefRow[],
	x: number,
	y: number,
	width: number
): number {
	const { regular, bold } = loadFonts();
	const rowFace = face(regular, l.rowSize);
	const boldRowFace = face(bold, l.rowSize);
	const regionFace = face(bold, l.regionSize);
	const regionWidth = int(l.regionSize * 2.6);
	const gap = int(l.rowSize * 0.6);
	const changeWidth = boldRowFace.measure('▼ −00.00%');
	const levelWidth = rowFace.measure('00,000.00');
	for (const row of rows) {
		y += l.rowStep;
		let nameX = x;
		if (row.region) {
			const top = y - int(l.rowSize * 0.82);
			img.fillRect(x, top, regionWidth, int(l.rowSize * 1.08), regionBG);
			const code = fit(regionFace, row.region, regionWidth - 6);
			const codeX = x + int((regionWidth - regionFace.measure(code)) / 2);
			img.drawText(regionFace, codeX, y - int((l.rowSize - l.regionSize) / 2), code, muted);
		}
		nameX += regionWidth + gap;
		const [raw, tone] = changeLabel(row.change, row.direction);
		const label = fit(boldRowFace, raw, changeWidth);
		img.drawText(boldRowFace, x + width - boldRowFace.measure(label), y, label, tone);
		const levelRight = x + width - changeWidth - gap;
		const level = fit(rowFace, row.level, levelWidth);
		img.drawText(rowFace, levelRight - rowFace.measure(level), y, level, muted);
		const nameWidth = levelRight - levelWidth - gap - nameX;
		if (nameWidth > 0)
			img.drawText(boldRowFace, nameX, y, fit(boldRowFace, row.name, nameWidth), foreground);
	}
	return y + int(l.rowSize * 0.4);
}

function drawBriefItems(
	img: Canvas,
	l: BriefLayout,
	items: string[],
	x: number,
	y: number,
	width: number,
	limit: number
) {
	if (items.length === 0) return;
	const itemFace = face(loadFonts().regular, l.itemSize);
	const indent = int(l.itemSize * 1.1);
	for (const line of layoutBullets(
		itemFace,
		items,
		width - indent,
		y,
		limit,
		l.itemGap,
		l.itemStep,
		l.itemLines
	)) {
		if (line.first) img.drawText(itemFace, x, line.y, '•', accent);
		img.drawText(itemFace, x + indent, line.y, line.text, foreground);
	}
}

export async function renderBrief(input: BriefCard, f: Format): Promise<Uint8Array> {
	const { regular, bold } = loadFonts();
	const c = boundBrief(input);
	const l = layoutFor(f);
	const img = new Canvas(f.width, f.height, background);
	const left = l.pad;
	const right = f.width - l.pad;
	const width = right - left;

	let y = l.pad + int(l.brandSize);
	img.drawText(face(bold, l.brandSize), left, y, 'NORVIQ', accent);
	if (c.date) {
		const dateFace = face(regular, l.dateSize);
		const date = fit(dateFace, c.date, int(width / 2));
		img.drawText(dateFace, right - dateFace.measure(date), y, date, muted);
	}
	const titleFace = face(bold, l.titleSize);
	y += int(l.titleSize * 0.4);
	for (const line of wrap(titleFace, c.title, width, l.titleLines)) {
		y += int(l.titleSize * 1.15);
		img.drawText(titleFace, left, y, line, foreground);
	}
	y += int(l.titleSize * 0.45);
	img.fillRect(left, y, width, 2, rule);
	const contentTop = y + 8;

	const disclaimerFace = face(regular, l.disclaimerSize);
	const disclaimer = wrap(disclaimerFace, c.disclaimer, width, l.disclaimerLines);
	const lineStep = int(l.disclaimerSize * 1.3);
	const footerY = f.height - l.pad - (disclaimer.length - 1) * lineStep;
	disclaimer.forEach((line, i) =>
		img.drawText(disclaimerFace, left, footerY + i * lineStep, line, muted)
	);
	const urlY = footerY - int(l.disclaimerSize * 1.9);
	if (c.shortURL) {
		const urlFace = face(bold, l.urlSize);
		img.drawText(urlFace, left, urlY, fit(urlFace, c.shortURL, width), accent);
	}
	const contentBottom = urlY - int(l.urlSize * 1.6);

	if (l.portrait) {
		y = contentTop;
		if (c.rows.length > 0) {
			y = drawBriefRows(img, l, c.rows, left, y, width);
			y += l.itemGap;
			img.fillRect(left, y, width, 2, rule);
			y += 8;
		}
		drawBriefItems(img, l, c.items, left, y, width, contentBottom);
	} else if (c.rows.length > 0 && c.items.length > 0) {
		const leftWidth = Math.max(l.leftColumnMin, int((width * 55) / 100));
		drawBriefRows(img, l, c.rows, left, contentTop, leftWidth);
		const itemsX = left + leftWidth + l.columnGap;
		img.fillRect(
			itemsX - int(l.columnGap / 2),
			contentTop + 12,
			2,
			contentBottom - contentTop - 12,
			rule
		);
		drawBriefItems(img, l, c.items, itemsX, contentTop, right - itemsX, contentBottom);
	} else if (c.rows.length > 0) {
		drawBriefRows(img, l, c.rows, left, contentTop, width);
	} else {
		drawBriefItems(img, l, c.items, left, contentTop, width, contentBottom);
	}
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
