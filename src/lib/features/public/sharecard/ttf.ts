// A minimal TrueType reader for the share cards: cmap (formats 4 and 12),
// hmtx advances and glyf outlines (simple and composite). It measures and
// outlines text the way golang.org/x/image/font/opentype does with
// HintingFull at 72 DPI, which is what norviq-web's sharecard package uses:
// advances rounded to whole pixels, no kerning (the Go fonts have no kern or
// GPOS table).

export interface Point {
	x: number;
	y: number;
}

/** One closed contour, as quadratic segments: on-curve start, then [control?, end] pairs. */
export type Contour = { start: Point; segs: { c?: Point; p: Point }[] };

export class TTFont {
	private view: DataView;
	private tables = new Map<string, { offset: number; length: number }>();
	readonly unitsPerEm: number;
	private indexToLocFormat: number;
	private numGlyphs: number;
	private numHMetrics: number;
	private cmap: (cp: number) => number;
	private outlineCache = new Map<number, Contour[]>();

	constructor(bytes: Uint8Array) {
		this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		const v = this.view;
		const n = v.getUint16(4);
		for (let i = 0; i < n; i++) {
			const rec = 12 + 16 * i;
			const tag = String.fromCharCode(v.getUint8(rec), v.getUint8(rec + 1), v.getUint8(rec + 2), v.getUint8(rec + 3));
			this.tables.set(tag, { offset: v.getUint32(rec + 8), length: v.getUint32(rec + 12) });
		}
		const head = this.table('head');
		this.unitsPerEm = v.getUint16(head + 18);
		this.indexToLocFormat = v.getInt16(head + 50);
		this.numGlyphs = v.getUint16(this.table('maxp') + 4);
		this.numHMetrics = v.getUint16(this.table('hhea') + 34);
		this.cmap = this.readCmap();
	}

	private table(tag: string): number {
		const t = this.tables.get(tag);
		if (!t) throw new Error('ttf: missing table ' + tag);
		return t.offset;
	}

	private readCmap(): (cp: number) => number {
		const v = this.view;
		const base = this.table('cmap');
		const n = v.getUint16(base + 2);
		let fmt4 = -1;
		let fmt12 = -1;
		for (let i = 0; i < n; i++) {
			const platform = v.getUint16(base + 4 + 8 * i);
			const encoding = v.getUint16(base + 6 + 8 * i);
			const off = base + v.getUint32(base + 8 + 8 * i);
			const format = v.getUint16(off);
			if (format === 12 && (platform === 0 || (platform === 3 && encoding === 10))) fmt12 = off;
			if (format === 4 && (platform === 0 || (platform === 3 && encoding === 1))) fmt4 = off;
		}
		if (fmt12 >= 0) {
			const groups = v.getUint32(fmt12 + 12);
			return (cp) => {
				let lo = 0;
				let hi = groups - 1;
				while (lo <= hi) {
					const mid = (lo + hi) >> 1;
					const g = fmt12 + 16 + 12 * mid;
					const start = v.getUint32(g);
					const end = v.getUint32(g + 4);
					if (cp < start) hi = mid - 1;
					else if (cp > end) lo = mid + 1;
					else return v.getUint32(g + 8) + (cp - start);
				}
				return 0;
			};
		}
		if (fmt4 < 0) return () => 0;
		const segX2 = v.getUint16(fmt4 + 6);
		const ends = fmt4 + 14;
		const starts = ends + segX2 + 2;
		const deltas = starts + segX2;
		const ranges = deltas + segX2;
		return (cp) => {
			if (cp > 0xffff) return 0;
			for (let i = 0; i < segX2; i += 2) {
				if (cp > v.getUint16(ends + i)) continue;
				const start = v.getUint16(starts + i);
				if (cp < start) return 0;
				const delta = v.getInt16(deltas + i);
				const rangeOffset = v.getUint16(ranges + i);
				if (rangeOffset === 0) return (cp + delta) & 0xffff;
				const g = v.getUint16(ranges + i + rangeOffset + 2 * (cp - start));
				return g === 0 ? 0 : (g + delta) & 0xffff;
			}
			return 0;
		};
	}

	glyphIndex(cp: number): number {
		return this.cmap(cp);
	}

	/** Advance width in font units. */
	advanceUnits(glyph: number): number {
		const g = Math.min(glyph, this.numHMetrics - 1);
		return this.view.getUint16(this.table('hmtx') + 4 * g);
	}

	private glyphRange(glyph: number): [number, number] {
		const v = this.view;
		const loca = this.table('loca');
		let a: number, b: number;
		if (this.indexToLocFormat === 0) {
			a = v.getUint16(loca + 2 * glyph) * 2;
			b = v.getUint16(loca + 2 * glyph + 2) * 2;
		} else {
			a = v.getUint32(loca + 4 * glyph);
			b = v.getUint32(loca + 4 * glyph + 4);
		}
		return [this.table('glyf') + a, b - a];
	}

	/** Contours in font units, y up. */
	outline(glyph: number): Contour[] {
		const hit = this.outlineCache.get(glyph);
		if (hit) return hit;
		const out = glyph < this.numGlyphs ? this.readGlyph(glyph, 0) : [];
		this.outlineCache.set(glyph, out);
		return out;
	}

	private readGlyph(glyph: number, depth: number): Contour[] {
		const v = this.view;
		const [off, len] = this.glyphRange(glyph);
		if (len === 0 || depth > 8) return [];
		const nContours = v.getInt16(off);
		if (nContours < 0) return this.readComposite(off + 10, depth);
		const endPts: number[] = [];
		for (let i = 0; i < nContours; i++) endPts.push(v.getUint16(off + 10 + 2 * i));
		const nPts = nContours ? endPts[nContours - 1] + 1 : 0;
		let p = off + 10 + 2 * nContours;
		p += 2 + v.getUint16(p); // instructions
		const flags: number[] = [];
		while (flags.length < nPts) {
			const f = v.getUint8(p++);
			flags.push(f);
			if (f & 8) {
				let r = v.getUint8(p++);
				while (r-- > 0) flags.push(f);
			}
		}
		const xs: number[] = [];
		let x = 0;
		for (const f of flags) {
			if (f & 2) {
				const d = v.getUint8(p++);
				x += f & 16 ? d : -d;
			} else if (!(f & 16)) {
				x += v.getInt16(p);
				p += 2;
			}
			xs.push(x);
		}
		const ys: number[] = [];
		let y = 0;
		for (const f of flags) {
			if (f & 4) {
				const d = v.getUint8(p++);
				y += f & 32 ? d : -d;
			} else if (!(f & 32)) {
				y += v.getInt16(p);
				p += 2;
			}
			ys.push(y);
		}
		const contours: Contour[] = [];
		let first = 0;
		for (const last of endPts) {
			const pts: { x: number; y: number; on: boolean }[] = [];
			for (let i = first; i <= last; i++) pts.push({ x: xs[i], y: ys[i], on: (flags[i] & 1) === 1 });
			first = last + 1;
			if (pts.length > 0) contours.push(toContour(pts));
		}
		return contours;
	}

	private readComposite(p: number, depth: number): Contour[] {
		const v = this.view;
		const out: Contour[] = [];
		for (;;) {
			const flags = v.getUint16(p);
			const glyph = v.getUint16(p + 2);
			p += 4;
			let dx = 0;
			let dy = 0;
			if (flags & 1) {
				dx = v.getInt16(p);
				dy = v.getInt16(p + 2);
				p += 4;
			} else {
				dx = v.getInt8(p);
				dy = v.getInt8(p + 1);
				p += 2;
			}
			let a = 1,
				b = 0,
				c = 0,
				d = 1;
			const f2 = (o: number) => v.getInt16(o) / 16384;
			if (flags & 8) {
				a = d = f2(p);
				p += 2;
			} else if (flags & 0x40) {
				a = f2(p);
				d = f2(p + 2);
				p += 4;
			} else if (flags & 0x80) {
				a = f2(p);
				b = f2(p + 2);
				c = f2(p + 4);
				d = f2(p + 6);
				p += 8;
			}
			const tf = (q: Point): Point => ({ x: a * q.x + c * q.y + dx, y: b * q.x + d * q.y + dy });
			for (const ct of this.readGlyph(glyph, depth + 1)) {
				out.push({ start: tf(ct.start), segs: ct.segs.map((s) => ({ c: s.c && tf(s.c), p: tf(s.p) })) });
			}
			if (!(flags & 0x20)) break;
		}
		return out;
	}
}

/** TrueType on/off-curve points to quadratic segments (implied on-curve midpoints). */
function toContour(pts: { x: number; y: number; on: boolean }[]): Contour {
	const n = pts.length;
	let startIdx = pts.findIndex((q) => q.on);
	let start: Point;
	if (startIdx < 0) {
		start = { x: (pts[0].x + pts[n - 1].x) / 2, y: (pts[0].y + pts[n - 1].y) / 2 };
		startIdx = 0;
		// all off-curve: walk every point as a control
		const segs: Contour['segs'] = [];
		for (let i = 0; i < n; i++) {
			const cur = pts[i];
			const next = pts[(i + 1) % n];
			segs.push({ c: cur, p: { x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2 } });
		}
		return { start, segs };
	}
	start = pts[startIdx];
	const segs: Contour['segs'] = [];
	let ctrl: Point | null = null;
	for (let k = 1; k <= n; k++) {
		const q = pts[(startIdx + k) % n];
		if (q.on) {
			segs.push(ctrl ? { c: ctrl, p: q } : { p: q });
			ctrl = null;
		} else if (ctrl) {
			const mid = { x: (ctrl.x + q.x) / 2, y: (ctrl.y + q.y) / 2 };
			segs.push({ c: ctrl, p: mid });
			ctrl = q;
		} else {
			ctrl = q;
		}
	}
	if (ctrl) segs.push({ c: ctrl, p: start });
	return { start, segs };
}

/** A font at one size, measured and drawn like x/image opentype.NewFace(Size, DPI 72, HintingFull). */
export class Face {
	/** ppem in 26.6 fixed point. */
	private ppem: number;
	constructor(
		readonly font: TTFont,
		readonly size: number
	) {
		this.ppem = Math.trunc(0.5 + size * 64);
	}

	/** Go's sfnt scale(): divide rounding half away from zero. */
	private scale(x: number): number {
		const u = this.font.unitsPerEm;
		return Math.trunc((x >= 0 ? x + Math.trunc(u / 2) : x - Math.trunc(u / 2)) / u);
	}

	/** GlyphAdvance in 26.6, quantised to the nearest pixel. */
	advance26(cp: number): number {
		const adv = this.scale(this.font.advanceUnits(this.font.glyphIndex(cp)) * this.ppem);
		return (adv + 32) & ~63;
	}

	/** font.MeasureString(...).Ceil(), in pixels. */
	measure(s: string): number {
		let a = 0;
		for (const ch of s) a += this.advance26(ch.codePointAt(0)!);
		return (a + 63) >> 6;
	}

	/** Pixels per font unit. */
	get unitScale(): number {
		return this.ppem / 64 / this.font.unitsPerEm;
	}
}
