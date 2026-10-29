// An opaque RGB canvas with anti-aliased glyph rendering and a PNG encoder:
// the parts of image/draw, x/image/vector and image/png that norviq-web's
// sharecard package uses. Runs in a Worker (CompressionStream for zlib).
import type { Face } from './ttf.js';

export type RGB = readonly [number, number, number];

export class Canvas {
	readonly pix: Uint8Array;
	constructor(
		readonly width: number,
		readonly height: number,
		bg: RGB
	) {
		this.pix = new Uint8Array(width * height * 3);
		for (let i = 0; i < this.pix.length; i += 3) {
			this.pix[i] = bg[0];
			this.pix[i + 1] = bg[1];
			this.pix[i + 2] = bg[2];
		}
	}

	/** fillRect (draw.Src), clipped. */
	fillRect(x: number, y: number, w: number, h: number, c: RGB) {
		if (w <= 0 || h <= 0) return;
		const x0 = Math.max(0, x);
		const y0 = Math.max(0, y);
		const x1 = Math.min(this.width, x + w);
		const y1 = Math.min(this.height, y + h);
		for (let yy = y0; yy < y1; yy++) {
			for (let xx = x0; xx < x1; xx++) {
				const i = (yy * this.width + xx) * 3;
				this.pix[i] = c[0];
				this.pix[i + 1] = c[1];
				this.pix[i + 2] = c[2];
			}
		}
	}

	private blend(x: number, y: number, c: RGB, a: number) {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height || a <= 0) return;
		const i = (y * this.width + x) * 3;
		const k = Math.min(1, a);
		this.pix[i] = Math.round(this.pix[i] + (c[0] - this.pix[i]) * k);
		this.pix[i + 1] = Math.round(this.pix[i + 1] + (c[1] - this.pix[i + 1]) * k);
		this.pix[i + 2] = Math.round(this.pix[i + 2] + (c[2] - this.pix[i + 2]) * k);
	}

	/** font.Drawer{Dot: (x, y)}.DrawString(s): y is the baseline. */
	drawText(face: Face, x: number, y: number, s: string, c: RGB) {
		let dot = x * 64;
		for (const ch of s) {
			const cp = ch.codePointAt(0)!;
			this.drawGlyph(face, cp, dot / 64, y, c);
			dot += face.advance26(cp);
		}
	}

	private drawGlyph(face: Face, cp: number, ox: number, oy: number, c: RGB) {
		const contours = face.font.outline(face.font.glyphIndex(cp));
		if (contours.length === 0) return;
		const k = face.unitScale;
		// Pixel space: x right, y down.
		const lines: number[] = [];
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;
		const push = (x0: number, y0: number, x1: number, y1: number) => {
			lines.push(x0, y0, x1, y1);
			minX = Math.min(minX, x0, x1);
			maxX = Math.max(maxX, x0, x1);
			minY = Math.min(minY, y0, y1);
			maxY = Math.max(maxY, y0, y1);
		};
		const tx = (p: { x: number }) => ox + p.x * k;
		const ty = (p: { y: number }) => oy - p.y * k;
		for (const ct of contours) {
			let px = tx(ct.start);
			let py = ty(ct.start);
			for (const seg of ct.segs) {
				const ex = tx(seg.p);
				const ey = ty(seg.p);
				if (seg.c) {
					const cx = tx(seg.c);
					const cy = ty(seg.c);
					const dev = Math.abs(px - 2 * cx + ex) + Math.abs(py - 2 * cy + ey);
					const n = Math.max(1, Math.min(16, Math.ceil(Math.sqrt(dev * 2))));
					let lx = px,
						ly = py;
					for (let i = 1; i <= n; i++) {
						const t = i / n;
						const mt = 1 - t;
						const qx = mt * mt * px + 2 * mt * t * cx + t * t * ex;
						const qy = mt * mt * py + 2 * mt * t * cy + t * t * ey;
						push(lx, ly, qx, qy);
						lx = qx;
						ly = qy;
					}
				} else {
					push(px, py, ex, ey);
				}
				px = ex;
				py = ey;
			}
		}
		const left = Math.floor(minX);
		const top = Math.floor(minY);
		const w = Math.ceil(maxX) - left;
		const h = Math.ceil(maxY) - top;
		if (w <= 0 || h <= 0) return;
		const stride = w + 2;
		const acc = new Float32Array(stride * h);
		for (let i = 0; i < lines.length; i += 4) {
			accumulateLine(acc, stride, h, lines[i] - left, lines[i + 1] - top, lines[i + 2] - left, lines[i + 3] - top);
		}
		for (let yy = 0; yy < h; yy++) {
			let sum = 0;
			for (let xx = 0; xx < stride; xx++) {
				sum += acc[yy * stride + xx];
				const a = Math.abs(sum);
				if (a > 0.002) this.blend(left + xx, top + yy, c, a);
			}
		}
	}

	/** image/png Encode of an opaque image: 8-bit RGB, zlib via CompressionStream. */
	async png(): Promise<Uint8Array> {
		const row = this.width * 3 + 1;
		const raw = new Uint8Array(row * this.height);
		for (let y = 0; y < this.height; y++) {
			raw[y * row] = 0; // filter: none
			raw.set(this.pix.subarray(y * this.width * 3, (y + 1) * this.width * 3), y * row + 1);
		}
		const zdata = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
		const ihdr = new Uint8Array(13);
		const dv = new DataView(ihdr.buffer);
		dv.setUint32(0, this.width);
		dv.setUint32(4, this.height);
		ihdr.set([8, 2, 0, 0, 0], 8);
		const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zdata), chunk('IEND', new Uint8Array(0))];
		const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
		let o = 0;
		for (const p of parts) {
			out.set(p, o);
			o += p.length;
		}
		return out;
	}
}

/** Signed-area coverage accumulation of one line (the font-rs / x/image/vector scheme). */
function accumulateLine(a: Float32Array, stride: number, h: number, x0: number, y0: number, x1: number, y1: number) {
	if (y0 === y1) return;
	let dir = 1;
	if (y0 > y1) {
		dir = -1;
		[x0, y0, x1, y1] = [x1, y1, x0, y0];
	}
	const dxdy = (x1 - x0) / (y1 - y0);
	let x = x0;
	if (y0 < 0) x -= y0 * dxdy;
	const yEnd = Math.min(h, Math.ceil(y1));
	for (let y = Math.max(0, Math.floor(y0)); y < yEnd; y++) {
		const line = y * stride;
		const dy = Math.min(y + 1, y1) - Math.max(y, y0);
		const xnext = x + dxdy * dy;
		const d = dy * dir;
		const xa = Math.max(0, Math.min(x, xnext));
		const xb = Math.max(0, Math.max(x, xnext));
		const xaf = Math.floor(xa);
		const xai = xaf;
		const xbc = Math.ceil(xb);
		const xbi = xbc;
		const at = (i: number, v: number) => {
			if (i >= 0 && i < stride) a[line + i] += v;
		};
		if (xbi <= xai + 1) {
			const xmf = 0.5 * (x + xnext) - xaf;
			at(xai, d - d * xmf);
			at(xai + 1, d * xmf);
		} else {
			const s = 1 / (xb - xa);
			const x0f = xa - xaf;
			const a0 = 0.5 * s * (1 - x0f) * (1 - x0f);
			const x1f = xb - xbc + 1;
			const am = 0.5 * s * x1f * x1f;
			at(xai, d * a0);
			if (xbi === xai + 2) {
				at(xai + 1, d * (1 - a0 - am));
			} else {
				const a1 = s * (1.5 - x0f);
				at(xai + 1, d * (a1 - a0));
				for (let xi = xai + 2; xi < xbi - 1; xi++) at(xi, d * s);
				const a2 = a1 + (xbi - xai - 3) * s;
				at(xbi - 1, d * (1 - a2 - am));
			}
			at(xbi, d * am);
		}
		x = xnext;
	}
}

const crcTable = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

function crc32(bytes: Uint8Array, crc = 0xffffffff): number {
	for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
	return crc;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
	const out = new Uint8Array(12 + data.length);
	const dv = new DataView(out.buffer);
	dv.setUint32(0, data.length);
	for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
	out.set(data, 8);
	dv.setUint32(8 + data.length, (crc32(out.subarray(4, 8 + data.length)) ^ 0xffffffff) >>> 0);
	return out;
}
