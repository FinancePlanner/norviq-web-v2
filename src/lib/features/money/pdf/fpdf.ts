import { helvetica, helveticaB, helveticaI } from './core-widths.js';

// Minimal port of the slice of go-pdf/fpdf (v0.9.0) that expenses_pdf.go uses:
// A4 portrait in mm, the Helvetica core fonts (regular, bold, italic) in
// WinAnsi, CellFormat / MultiCell / Ln / Line / RoundedRect, header and footer
// callbacks and automatic page breaks, written uncompressed (the Go report
// called SetCompression(false)). Layout maths follow fpdf.go line for line, so
// the report lays out the same. No npm dependency, runs in a Worker.
//
// Difference from Go: fpdf wrote Go's UTF-8 bytes straight into a WinAnsi
// font, so non-ASCII titles came out as mojibake. Here characters are mapped to
// cp1252 and anything outside it becomes "?".

type Style = '' | 'B' | 'I';

const FONTS: Record<Style, { name: string; widths: readonly number[] }> = {
	'': { name: 'Helvetica', widths: helvetica },
	B: { name: 'Helvetica-Bold', widths: helveticaB },
	I: { name: 'Helvetica-Oblique', widths: helveticaI }
};

// cp1252 code points 0x80–0x9F that differ from Latin-1.
const CP1252_EXTRA: Record<number, number> = {
	0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
	0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
	0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
	0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f
};

function toWinAnsi(s: string): string {
	let out = '';
	for (const ch of s) {
		const cp = ch.codePointAt(0)!;
		if (cp < 0x80 || (cp >= 0xa0 && cp <= 0xff)) out += ch;
		else if (CP1252_EXTRA[cp] !== undefined) out += String.fromCharCode(CP1252_EXTRA[cp]);
		else out += '?';
	}
	return out;
}

const fmt2 = (n: number) => n.toFixed(2);
const fmt3 = (n: number) => n.toFixed(3);

function escape(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\r/g, '\\r');
}

export class Fpdf {
	readonly k = 72 / 25.4;
	readonly w = 210;
	readonly h = 297;
	x = 0;
	y = 0;
	lMargin = 10;
	tMargin = 10;
	rMargin = 10;
	bMargin = 20;
	readonly cMargin = 28.35 / (72 / 25.4) / 10;
	lineWidth = 0.567 / (72 / 25.4);
	lasth = 0;
	autoPageBreak = true;
	pageBreakTrigger = 0;

	#pages: string[] = [];
	#page = 0;
	#style: Style = '';
	#family = '';
	#fontSizePt = 12;
	#fontSize = 12 / (72 / 25.4);
	#drawColor = '0 G';
	#fillColor = '0 g';
	#textColor = '0 g';
	#colorFlag = false;
	#inHeader = false;
	#inFooter = false;
	#header: (() => void) | null = null;
	#footer: (() => void) | null = null;
	#usedFonts = new Set<Style>();

	setMargins(left: number, top: number, right: number) {
		this.lMargin = left;
		this.tMargin = top;
		this.rMargin = right;
	}

	setAutoPageBreak(auto: boolean, margin: number) {
		this.autoPageBreak = auto;
		this.bMargin = margin;
		this.pageBreakTrigger = this.h - margin;
	}

	setHeaderFunc(fn: () => void) {
		this.#header = fn;
	}

	setFooterFunc(fn: () => void) {
		this.#footer = fn;
	}

	pageNo() {
		return this.#page;
	}

	#out(s: string) {
		this.#pages[this.#page - 1] += s + '\n';
	}

	addPage() {
		const family = this.#family;
		const style = this.#style;
		const size = this.#fontSizePt;
		const lw = this.lineWidth;
		const dc = this.#drawColor;
		const fc = this.#fillColor;
		const tc = this.#textColor;
		const cf = this.#colorFlag;
		if (this.#page > 0 && this.#footer) {
			this.#inFooter = true;
			this.#footer();
			this.#inFooter = false;
		}
		this.#pages.push('');
		this.#page++;
		this.x = this.lMargin;
		this.y = this.tMargin;
		this.#family = '';
		this.#out(fmt2(lw * this.k) + ' w');
		if (family) this.setFont(family, style, size);
		this.#drawColor = dc;
		if (dc !== '0 G') this.#out(dc);
		this.#fillColor = fc;
		if (fc !== '0 g') this.#out(fc);
		this.#textColor = tc;
		this.#colorFlag = cf;
		if (this.#header) {
			this.#inHeader = true;
			this.#header();
			this.#inHeader = false;
		}
		if (this.lineWidth !== lw) {
			this.lineWidth = lw;
			this.#out(fmt2(lw * this.k) + ' w');
		}
		if (family) this.setFont(family, style, size);
		if (this.#drawColor !== dc) {
			this.#drawColor = dc;
			this.#out(dc);
		}
		if (this.#fillColor !== fc) {
			this.#fillColor = fc;
			this.#out(fc);
		}
		this.#textColor = tc;
		this.#colorFlag = cf;
	}

	setFont(family: string, style: Style, size: number) {
		this.#family = family;
		this.#style = style;
		this.#usedFonts.add(style);
		this.#fontSizePt = size;
		this.#fontSize = size / this.k;
		if (this.#page > 0) this.#out(`BT /F${this.#fontIndex(style)} ${fmt2(size)} Tf ET`);
	}

	#fontIndex(style: Style) {
		return ['', 'B', 'I'].indexOf(style) + 1;
	}

	static #rgb(r: number, g: number, b: number, op: string) {
		if (r === g && g === b) return `${fmt3(r / 255)} ${op === 'rg' ? 'g' : 'G'}`;
		return `${fmt3(r / 255)} ${fmt3(g / 255)} ${fmt3(b / 255)} ${op}`;
	}

	setTextColor(r: number, g: number, b: number) {
		this.#textColor = Fpdf.#rgb(r, g, b, 'rg');
		this.#colorFlag = this.#fillColor !== this.#textColor;
	}

	setDrawColor(r: number, g: number, b: number) {
		this.#drawColor = Fpdf.#rgb(r, g, b, 'RG');
		if (this.#page > 0) this.#out(this.#drawColor);
	}

	setFillColor(r: number, g: number, b: number) {
		this.#fillColor = Fpdf.#rgb(r, g, b, 'rg');
		this.#colorFlag = this.#fillColor !== this.#textColor;
		if (this.#page > 0) this.#out(this.#fillColor);
	}

	getStringWidth(s: string): number {
		const widths = FONTS[this.#style].widths;
		let w = 0;
		for (const ch of toWinAnsi(s)) w += widths[ch.charCodeAt(0)] ?? 0;
		return (w * this.#fontSize) / 1000;
	}

	getY() {
		return this.y;
	}

	getX() {
		return this.x;
	}

	/** SetLineWidth(width) in mm. */
	setLineWidth(width: number) {
		this.lineWidth = width;
		if (this.#page > 0) this.#out(fmt2(width * this.k) + ' w');
	}

	/** Rect(x, y, w, h, styleStr): "D" (or "") strokes, "F" fills, "DF"/"FD" both. */
	rect(x: number, y: number, w: number, h: number, style: '' | 'D' | 'F' | 'DF' | 'FD') {
		const op = style === 'F' ? 'f' : style === 'DF' || style === 'FD' ? 'B' : 'S';
		const k = this.k;
		this.#out(`${fmt2(x * k)} ${fmt2((this.h - y) * k)} ${fmt2(w * k)} ${fmt2(-h * k)} re ${op}`);
	}

	setX(x: number) {
		this.x = x >= 0 ? x : this.w + x;
	}

	setY(y: number) {
		this.x = this.lMargin;
		this.y = y >= 0 ? y : this.h + y;
	}

	setXY(x: number, y: number) {
		this.setY(y);
		this.setX(x);
	}

	ln(h = -1) {
		this.x = this.lMargin;
		this.y += h < 0 ? this.lasth : h;
	}

	line(x1: number, y1: number, x2: number, y2: number) {
		const k = this.k;
		this.#out(`${fmt2(x1 * k)} ${fmt2((this.h - y1) * k)} m ${fmt2(x2 * k)} ${fmt2((this.h - y2) * k)} l S`);
	}

	/** RoundedRect(x, y, w, h, r, "1234", "F"): every corner rounded, filled. */
	roundedRectFilled(x: number, y: number, w: number, h: number, r: number) {
		const k = this.k;
		const hp = this.h;
		const myArc = 4 / 3 * (Math.SQRT2 - 1);
		const pt = (px: number, py: number) => `${fmt2(px * k)} ${fmt2((hp - py) * k)}`;
		const curve = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
			`${pt(x1, y1)} ${pt(x2, y2)} ${pt(x3, y3)} c`;
		const ops: string[] = [];
		ops.push(`${pt(x + r, y)} m`);
		ops.push(`${pt(x + w - r, y)} l`);
		let xc = x + w - r;
		let yc = y + r;
		ops.push(curve(xc + r * myArc, yc - r, xc + r, yc - r * myArc, xc + r, yc));
		ops.push(`${pt(x + w, y + h - r)} l`);
		xc = x + w - r;
		yc = y + h - r;
		ops.push(curve(xc + r, yc + r * myArc, xc + r * myArc, yc + r, xc, yc + r));
		ops.push(`${pt(x + r, y + h)} l`);
		xc = x + r;
		yc = y + h - r;
		ops.push(curve(xc - r * myArc, yc + r, xc - r, yc + r * myArc, xc - r, yc));
		ops.push(`${pt(x, y + r)} l`);
		xc = x + r;
		yc = y + r;
		ops.push(curve(xc - r, yc - r * myArc, xc - r * myArc, yc - r, xc, yc - r));
		ops.push('f');
		this.#out(ops.join(' '));
	}

	/** fpdf CellFormat: border "" or "B", align "L" or "R", ln 0/1/2. */
	cellFormat(w: number, h: number, txt: string, border: '' | 'B', ln: 0 | 1 | 2, align: 'L' | 'R', fill: boolean) {
		const k = this.k;
		if (
			this.y + h > this.pageBreakTrigger &&
			!this.#inHeader &&
			!this.#inFooter &&
			this.autoPageBreak
		) {
			const x = this.x;
			this.addPage();
			this.x = x;
		}
		if (w === 0) w = this.w - this.rMargin - this.x;
		const parts: string[] = [];
		if (fill) parts.push(`${fmt2(this.x * k)} ${fmt2((this.h - this.y) * k)} ${fmt2(w * k)} ${fmt2(-h * k)} re f`);
		if (border === 'B') {
			const x = this.x;
			const y = this.y;
			parts.push(`${fmt2(x * k)} ${fmt2((this.h - (y + h)) * k)} m ${fmt2((x + w) * k)} ${fmt2((this.h - (y + h)) * k)} l S`);
		}
		if (txt !== '') {
			const dx = align === 'R' ? w - this.cMargin - this.getStringWidth(txt) : this.cMargin;
			let s = `BT ${fmt2((this.x + dx) * k)} ${fmt2((this.h - (this.y + 0.5 * h + 0.3 * this.#fontSize)) * k)} Td (${escape(toWinAnsi(txt))}) Tj ET`;
			if (this.#colorFlag) s = `q ${this.#textColor} ${s} Q`;
			parts.push(s);
		}
		if (parts.length) this.#out(parts.join(' '));
		this.lasth = h;
		if (ln > 0) {
			this.y += h;
			if (ln === 1) this.x = this.lMargin;
		} else {
			this.x += w;
		}
	}

	/** fpdf MultiCell with border "" and left alignment. */
	multiCell(w: number, h: number, txt: string, fill: boolean) {
		if (w === 0) w = this.w - this.rMargin - this.x;
		const widths = FONTS[this.#style].widths;
		const wmax = ((w - 2 * this.cMargin) * 1000) / this.#fontSize;
		const s = toWinAnsi(txt.replace(/\r/g, ''));
		let sep = -1;
		let i = 0;
		let j = 0;
		let l = 0;
		while (i < s.length) {
			const c = s[i];
			if (c === '\n') {
				this.cellFormat(w, h, s.slice(j, i), '', 2, 'L', fill);
				i++;
				sep = -1;
				j = i;
				l = 0;
				continue;
			}
			if (c === ' ') sep = i;
			l += widths[c.charCodeAt(0)] ?? 0;
			if (l > wmax) {
				if (sep === -1) {
					if (i === j) i++;
					this.cellFormat(w, h, s.slice(j, i), '', 2, 'L', fill);
				} else {
					this.cellFormat(w, h, s.slice(j, sep), '', 2, 'L', fill);
					i = sep + 1;
				}
				sep = -1;
				j = i;
				l = 0;
			} else {
				i++;
			}
		}
		this.cellFormat(w, h, s.slice(j, i), '', 2, 'L', fill);
		this.x = this.lMargin;
	}

	/** Closes the document (footer on the last page) and serialises it. */
	output(): Uint8Array {
		if (this.#page === 0) this.addPage();
		if (this.#footer) {
			this.#inFooter = true;
			this.#footer();
			this.#inFooter = false;
		}
		const objs: string[] = [];
		const add = (body: string) => {
			objs.push(body);
			return objs.length;
		};
		const fontObj: Partial<Record<Style, number>> = {};
		for (const style of ['', 'B', 'I'] as Style[]) {
			if (!this.#usedFonts.has(style)) continue;
			fontObj[style] = add(`<</Type /Font /BaseFont /${FONTS[style].name} /Subtype /Type1 /Encoding /WinAnsiEncoding>>`);
		}
		const fontRes = (['', 'B', 'I'] as Style[])
			.filter((s) => fontObj[s])
			.map((s) => `/F${this.#fontIndex(s)} ${fontObj[s]} 0 R`)
			.join(' ');
		const resources = add(`<</ProcSet [/PDF /Text] /Font <<${fontRes}>>>>`);
		const pagesID = objs.length + 1 + this.#pages.length * 2;
		const kids: number[] = [];
		for (const content of this.#pages) {
			const contentID = add(`<</Length ${content.length}>>\nstream\n${content}endstream`);
			kids.push(
				add(
					`<</Type /Page /Parent ${pagesID} 0 R /MediaBox [0 0 ${fmt2(this.w * this.k)} ${fmt2(this.h * this.k)}] /Resources ${resources} 0 R /Contents ${contentID} 0 R>>`
				)
			);
		}
		add(`<</Type /Pages /Kids [${kids.map((id) => `${id} 0 R`).join(' ')}] /Count ${kids.length}>>`);
		const info = add('<</Producer (Norviq)>>');
		const catalog = add(`<</Type /Catalog /Pages ${pagesID} 0 R>>`);

		let out = '%PDF-1.3\n';
		const offsets: number[] = [];
		objs.forEach((body, idx) => {
			offsets.push(out.length);
			out += `${idx + 1} 0 obj\n${body}\nendobj\n`;
		});
		const xref = out.length;
		out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
		for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
		out += `trailer\n<</Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R>>\nstartxref\n${xref}\n%%EOF\n`;

		const bytes = new Uint8Array(out.length);
		for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
		return bytes;
	}
}
