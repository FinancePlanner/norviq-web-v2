// Port of norviq-web internal/handlers/goal_planning_pdf.go.
//
// The Go web draws this report itself with go-pdf/fpdf. v2 runs on a Worker
// with no PDF dependency, so this file carries the small subset of fpdf the
// report uses (A4 portrait in mm, core Helvetica/Helvetica-Bold, CellFormat,
// MultiCell, Ln, AddPage, auto page break) and lays the page out with the
// same coordinates and the same arithmetic.
//
// One deliberate difference: fpdf received UTF-8 strings for a cp1252 core
// font, so "·", "•" and "—" came out as mojibake ("Â·", "â€¢", "â€”"). Text
// is encoded to WinAnsi here, so they print as intended. Characters outside
// WinAnsi become "?".
import { formatFloat } from '#lib/format.js';
import type { GoalPlan, PlanningGoalProgress } from './types.js';

const K = 72 / 25.4; // points per mm
const PAGE_W = 210;
const PAGE_H = 297;

// Helvetica AFM widths for 32..126 (MultiCell only wraps the regular face).
// prettier-ignore
const HELVETICA_ASCII = [
	278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
	556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
	1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
	667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
	333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
	556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584
];
const HELVETICA_EXTRA: Record<number, number> = { 0x95: 350, 0x96: 556, 0x97: 1000, 0xb7: 278 };

function charWidth(code: number): number {
	if (code >= 32 && code <= 126) return HELVETICA_ASCII[code - 32];
	return HELVETICA_EXTRA[code] ?? 556;
}

// Unicode → WinAnsiEncoding (cp1252) for 0x80..0x9F; 0xA0..0xFF map to themselves.
const CP1252: Record<number, number> = {
	0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
	0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
	0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
	0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f
};

/** Text as a string of WinAnsi bytes (each char code < 256). */
function winAnsi(text: string): string {
	let out = '';
	for (const ch of text) {
		const cp = ch.codePointAt(0)!;
		if (cp === 9 || cp === 10 || cp === 13 || (cp >= 32 && cp <= 126) || (cp >= 0xa0 && cp <= 0xff)) out += ch;
		else if (CP1252[cp] !== undefined) out += String.fromCharCode(CP1252[cp]);
		else out += '?';
	}
	return out;
}

const escapePDF = (s: string) =>
	s.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('\r', '\\r');

const f2 = (v: number) => formatFloat(v, 2);
const f3 = (v: number) => formatFloat(v, 3);

type Face = 'regular' | 'bold';

/** The slice of fpdf.Fpdf that buildGoalProgressPDF calls. */
class MiniPDF {
	private pages: string[] = [];
	private lMargin = 10;
	private tMargin = 10;
	private rMargin = 10;
	private cMargin = 1;
	private breakMargin = 20;
	private x = 10;
	private y = 10;
	private lasth = 0;
	private face: Face = 'regular';
	private sizePt = 12;
	private textColor = '0 g';
	private lineWidth = 0.567 / K;

	setMargins(left: number, top: number, right: number) {
		this.lMargin = left;
		this.tMargin = top;
		this.rMargin = right;
	}

	private get fontSize() {
		return this.sizePt / K;
	}

	private out(s: string) {
		this.pages[this.pages.length - 1] += s + '\n';
	}

	addPage() {
		this.pages.push('');
		this.x = this.lMargin;
		this.y = this.tMargin;
		this.out(`${f2(this.lineWidth * K)} w`);
		this.out(this.fontOp());
	}

	private fontOp() {
		return `BT /F${this.face === 'bold' ? 2 : 1} ${f2(this.sizePt)} Tf ET`;
	}

	setFont(face: Face, sizePt: number) {
		this.face = face;
		this.sizePt = sizePt;
		if (this.pages.length) this.out(this.fontOp());
	}

	setTextColor(r: number, g: number, b: number) {
		this.textColor =
			r === g && g === b ? `${f3(r / 255)} g` : `${f3(r / 255)} ${f3(g / 255)} ${f3(b / 255)} rg`;
	}

	getY() {
		return this.y;
	}

	ln(h: number) {
		this.x = this.lMargin;
		this.y += h < 0 ? this.lasth : h;
	}

	/** fpdf CellFormat with align "L", no fill. ln: 0 right, 1 next line, 2 below. */
	cell(w: number, h: number, txt: string, border: '' | '1', ln: 0 | 1 | 2) {
		this.cellEncoded(w, h, winAnsi(txt), border, ln);
	}

	private cellEncoded(w: number, h: number, text: string, border: '' | '1', ln: 0 | 1 | 2) {
		if (this.y + h > PAGE_H - this.breakMargin) {
			const x = this.x;
			this.addPage();
			this.x = x;
		}
		if (w === 0) w = PAGE_W - this.rMargin - this.x;
		const k = K;
		let s = '';
		if (border === '1') s += `${f2(this.x * k)} ${f2((PAGE_H - this.y) * k)} ${f2(w * k)} ${f2(-h * k)} re S `;
		if (text !== '') {
			const tx = (this.x + this.cMargin) * k;
			const ty = (PAGE_H - (this.y + 0.5 * h + 0.3 * this.fontSize)) * k;
			s += `q ${this.textColor} BT /F${this.face === 'bold' ? 2 : 1} ${f2(this.sizePt)} Tf ${f2(tx)} ${f2(ty)} Td (${escapePDF(text)}) Tj ET Q`;
		}
		if (s) this.out(s.trim());
		this.lasth = h;
		if (ln > 0) {
			this.y += h;
			if (ln === 1) this.x = this.lMargin;
		} else {
			this.x += w;
		}
	}

	/** fpdf MultiCell, align "L", no border: wraps on spaces, breaks long words. */
	multiCell(w: number, h: number, txt: string) {
		if (w === 0) w = PAGE_W - this.rMargin - this.x;
		const wmax = ((w - 2 * this.cMargin) * 1000) / this.fontSize;
		const s = winAnsi(txt).replaceAll('\r', '');
		let sep = -1;
		let i = 0;
		let j = 0;
		let l = 0;
		while (i < s.length) {
			const c = s.charCodeAt(i);
			if (c === 10) {
				this.cellEncoded(w, h, s.slice(j, i), '', 2);
				i++;
				sep = -1;
				j = i;
				l = 0;
				continue;
			}
			if (c === 32) sep = i;
			l += charWidth(c);
			if (l > wmax) {
				if (sep === -1) {
					if (i === j) i++;
					this.cellEncoded(w, h, s.slice(j, i), '', 2);
				} else {
					this.cellEncoded(w, h, s.slice(j, sep), '', 2);
					i = sep + 1;
				}
				sep = -1;
				j = i;
				l = 0;
			} else {
				i++;
			}
		}
		this.cellEncoded(w, h, s.slice(j, i), '', 2);
		this.x = this.lMargin;
	}

	output(): Uint8Array {
		const objects: string[] = [];
		const pageIDs: number[] = [];
		// 1 catalog, 2 pages, 3 Helvetica, 4 Helvetica-Bold, 5 info, then page/content pairs.
		objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
		objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
		objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
		objects[5] = `<< /Producer (Norviq) /CreationDate (D:${new Date()
			.toISOString()
			.replace(/[-:T]/g, '')
			.slice(0, 14)}Z) >>`;
		let next = 6;
		for (const content of this.pages) {
			const pageID = next++;
			const contentID = next++;
			pageIDs.push(pageID);
			objects[pageID] =
				`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f2(PAGE_W * K)} ${f2(PAGE_H * K)}] ` +
				`/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentID} 0 R >>`;
			objects[contentID] = `<< /Length ${content.length} >>\nstream\n${content}endstream`;
		}
		objects[2] = `<< /Type /Pages /Kids [${pageIDs.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIDs.length} >>`;

		let pdf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
		const offsets: number[] = [];
		for (let id = 1; id < next; id++) {
			offsets[id] = pdf.length;
			pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
		}
		const xref = pdf.length;
		pdf += `xref\n0 ${next}\n0000000000 65535 f \n`;
		for (let id = 1; id < next; id++) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
		pdf += `trailer\n<< /Size ${next} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
		const bytes = new Uint8Array(pdf.length);
		for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
		return bytes;
	}
}

/** strings.Title: upper-case the first letter of each word. */
function title(value: string): string {
	return value.replace(/(^|[^\p{L}\p{N}_'])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

const amount = (currency: string, value: number) => `${currency} ${formatFloat(value, 0)}`;

function goalPDFMetric(pdf: MiniPDF, label: string, value: number, currency: string) {
	pdf.setFont('bold', 11);
	pdf.cell(55, 8, label, '', 0);
	pdf.setFont('regular', 11);
	pdf.cell(0, 8, amount(currency, value), '', 1);
}

export function buildGoalProgressPDF(goal: GoalPlan, progress: PlanningGoalProgress): Uint8Array {
	const pdf = new MiniPDF();
	pdf.setMargins(16, 16, 16);
	pdf.addPage();
	pdf.setFont('bold', 22);
	pdf.cell(0, 10, goal.name, '', 1);
	pdf.setFont('regular', 10);
	pdf.setTextColor(90, 90, 90);
	pdf.cell(0, 7, 'Deterministic financial goal progress report', '', 1);
	pdf.setTextColor(0, 0, 0);
	pdf.ln(5);
	goalPDFMetric(pdf, 'Current value', progress.currentValue, goal.baseCurrency);
	goalPDFMetric(pdf, 'Target amount', goal.targetAmount, goal.baseCurrency);
	goalPDFMetric(pdf, 'Projected at target', progress.projectedValueAtTarget, goal.baseCurrency);
	pdf.setFont('bold', 11);
	pdf.cell(55, 8, 'Progress', '', 0);
	pdf.setFont('regular', 11);
	pdf.cell(0, 8, `${formatFloat(progress.percentComplete * 100, 0)}% · ${(progress.driftState ?? '').replaceAll('_', ' ')}`, '', 1);
	pdf.ln(5);
	pdf.setFont('bold', 14);
	pdf.cell(0, 8, 'Assumptions', '', 1);
	pdf.setFont('regular', 10);
	const assumptions = [
		`Risk profile: ${title(goal.riskProfile ?? '')}`,
		`Expected nominal annual return: ${formatFloat(goal.expectedAnnualReturn * 100, 1)}%`,
		`Planned monthly contribution: ${amount(goal.baseCurrency, goal.monthlyContribution)}`,
		`Observed monthly contribution: ${amount(goal.baseCurrency, progress.observedMonthlyContribution)}`,
		'Contributions are modeled at month end using an effective monthly rate.',
		'Target amounts are nominal. This report is a planning estimate, not financial advice.'
	];
	for (const line of assumptions) pdf.multiCell(0, 6, '• ' + line);
	pdf.ln(4);
	pdf.setFont('bold', 14);
	pdf.cell(0, 8, 'Projection', '', 1);
	pdf.setFont('bold', 9);
	const widths = [32, 48, 48, 48];
	['Date', 'Planned', 'Actual', 'Projected'].forEach((heading, index) => pdf.cell(widths[index], 7, heading, '1', 0));
	pdf.ln(-1);
	pdf.setFont('regular', 8);
	const trajectory = progress.trajectory ?? [];
	const step = Math.max(1, Math.trunc(trajectory.length / 30));
	for (let index = 0; index < trajectory.length; index += step) {
		const point = trajectory[index];
		const actual =
			point.actualValue !== null && point.actualValue !== undefined ? amount(goal.baseCurrency, point.actualValue) : '—';
		const values = [
			point.date,
			amount(goal.baseCurrency, point.plannedValue),
			actual,
			amount(goal.baseCurrency, point.projectedValue)
		];
		values.forEach((value, column) => pdf.cell(widths[column], 6, value, '1', 0));
		pdf.ln(-1);
		if (pdf.getY() > 270) pdf.addPage();
	}
	return pdf.output();
}

/** safeGoalFilename */
export function safeGoalFilename(value: string): string {
	const mapped = Array.from((value ?? '').trim().toLowerCase(), (ch) => (/^[a-z0-9]$/.test(ch) ? ch : '-')).join('');
	return mapped.replace(/^-+|-+$/g, '');
}
