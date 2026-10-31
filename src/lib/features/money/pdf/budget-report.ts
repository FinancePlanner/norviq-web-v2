import type { components } from '#lib/api/schema.js';
import { formatFloat } from '#lib/format.js';
import { Fpdf } from './fpdf.js';
import { monthLabel } from '../category-page/month.js';

// Port of writeExpensesBudgetPDF (norviq-web internal/handlers/expenses_pdf.go).

type Drift = components['schemas']['BudgetDriftDashboard'];
type Discipline = components['schemas']['BudgetDisciplineSummary'];
type Reallocation = components['schemas']['BudgetReallocationEventResponse'];

function pdfMoney(value: number, currency: string): string {
	return `${currency.toUpperCase()} ${formatFloat(value, 2)}`;
}

function truncatePDF(value: string, max: number): string {
	const r = Array.from(value);
	if (r.length <= max) return value;
	return r.slice(0, max - 1).join('') + '...';
}

function metricBox(
	pdf: Fpdf,
	label: string,
	value: number,
	currency: string,
	x: number,
	y: number
) {
	pdf.setXY(x, y);
	pdf.setFillColor(245, 247, 249);
	pdf.roundedRectFilled(x, y, 55, 20, 3);
	pdf.setXY(x + 4, y + 3);
	pdf.setFont('Helvetica', '', 8);
	pdf.setTextColor(92, 101, 111);
	pdf.cellFormat(47, 5, label, '', 1, 'L', false);
	pdf.setX(x + 4);
	pdf.setFont('Helvetica', 'B', 12);
	pdf.setTextColor(25, 34, 44);
	pdf.cellFormat(47, 7, pdfMoney(value, currency), '', 0, 'L', false);
}

function sectionHeading(pdf: Fpdf, title: string) {
	pdf.setFont('Helvetica', 'B', 13);
	pdf.setTextColor(28, 38, 48);
	pdf.cellFormat(0, 8, title, '', 1, 'L', false);
}

function tableHeader(pdf: Fpdf, values: string[], widths: number[]) {
	pdf.setFont('Helvetica', 'B', 8);
	pdf.setFillColor(232, 236, 240);
	pdf.setTextColor(45, 54, 64);
	values.forEach((v, i) => pdf.cellFormat(widths[i], 7, v, '', 0, 'L', true));
	pdf.ln(-1);
}

function tableRow(pdf: Fpdf, values: string[], widths: number[]) {
	pdf.setFont('Helvetica', '', 8);
	pdf.setTextColor(55, 65, 76);
	values.forEach((v, i) => pdf.cellFormat(widths[i], 7, v, 'B', 0, 'L', false));
	pdf.ln(-1);
}

function ensureBudgetPDFSpace(pdf: Fpdf, height: number) {
	if (pdf.getY() + height > 274) pdf.addPage();
}

export function writeExpensesBudgetPDF(
	month: Date,
	drift: Drift,
	discipline: Discipline | null,
	history: Reallocation[]
): Uint8Array {
	const pdf = new Fpdf();
	pdf.setMargins(16, 18, 16);
	pdf.setAutoPageBreak(true, 18);
	pdf.setHeaderFunc(() => {
		pdf.setFont('Helvetica', 'B', 9);
		pdf.setTextColor(32, 43, 56);
		pdf.cellFormat(0, 6, 'NORVIQ  /  BUDGET DISCIPLINE', '', 1, 'L', false);
		pdf.setDrawColor(214, 220, 227);
		pdf.line(16, 26, 194, 26);
		pdf.ln(4);
	});
	pdf.setFooterFunc(() => {
		pdf.setY(-13);
		pdf.setFont('Helvetica', '', 8);
		pdf.setTextColor(100, 107, 116);
		pdf.cellFormat(
			120,
			5,
			'Planning report only - no money movement or investment execution',
			'',
			0,
			'L',
			false
		);
		pdf.cellFormat(58, 5, `Page ${pdf.pageNo()}`, '', 0, 'R', false);
	});
	pdf.addPage();
	pdf.setFont('Helvetica', 'B', 24);
	pdf.setTextColor(18, 26, 35);
	pdf.cellFormat(0, 12, 'Monthly budget report', '', 1, 'L', false);
	pdf.setFont('Helvetica', '', 12);
	pdf.setTextColor(80, 89, 99);
	pdf.cellFormat(
		0,
		7,
		monthLabel(month) + '  /  ' + drift.currencyCode.toUpperCase(),
		'',
		1,
		'L',
		false
	);
	pdf.ln(5);

	metricBox(pdf, 'Expense target', drift.totalTarget, drift.currencyCode, 16, 48);
	metricBox(pdf, 'Actual spending', drift.totalActual, drift.currencyCode, 76, 48);
	metricBox(pdf, 'Drift', drift.totalDriftAmount, drift.currencyCode, 136, 48);
	pdf.setY(73);
	if (drift.lostInvestmentCapital > 0) {
		pdf.setFillColor(254, 242, 242);
		pdf.setTextColor(145, 40, 40);
		pdf.setFont('Helvetica', 'B', 10);
		pdf.multiCell(
			0,
			7,
			`Spending above target reduced available investment capital by ${pdfMoney(drift.lostInvestmentCapital, drift.currencyCode)} this month.`,
			true
		);
	}

	pdf.ln(6);
	sectionHeading(pdf, 'Category performance');
	const rows = [...drift.categories].sort((a, b) => b.driftAmount - a.driftAmount);
	const widths = [58, 26, 31, 31, 32];
	tableHeader(pdf, ['Category', 'Status', 'Target', 'Actual', 'Drift'], widths);
	for (const row of rows) {
		if (row.allocationKind !== 'expense') continue;
		ensureBudgetPDFSpace(pdf, 8);
		tableRow(
			pdf,
			[
				truncatePDF(row.title, 32),
				String(row.level).toUpperCase(),
				pdfMoney(row.targetAmount, drift.currencyCode),
				pdfMoney(row.actualAmount, drift.currencyCode),
				pdfMoney(row.driftAmount, drift.currencyCode)
			],
			widths
		);
	}

	if (discipline) {
		pdf.ln(7);
		sectionHeading(pdf, 'Discipline history');
		const score =
			discipline.currentScore !== undefined && discipline.currentScore !== null
				? `${formatFloat(discipline.currentScore, 0)} / 100`
				: 'Not available';
		pdf.setFont('Helvetica', '', 10);
		pdf.setTextColor(55, 65, 76);
		pdf.cellFormat(
			0,
			7,
			`Current score: ${score}     Completed-month streak: ${discipline.completedMonthStreak}     Within plan: ${discipline.compliantMonths} of ${discipline.evaluatedMonths}`,
			'',
			1,
			'L',
			false
		);
	}

	const y = month.getUTCFullYear();
	const m = month.getUTCMonth() + 1;
	const filtered = history.filter((event) => {
		const [ey, em] = event.effectiveMonth.split('-').map(Number);
		return ey === y && em === m;
	});
	pdf.ln(6);
	sectionHeading(pdf, 'Reallocation history');
	pdf.setFont('Helvetica', '', 10);
	pdf.setTextColor(55, 65, 76);
	if (filtered.length === 0) {
		pdf.cellFormat(0, 7, 'No target reallocations recorded for this month.', '', 1, 'L', false);
	}
	for (const event of filtered) {
		pdf.cellFormat(
			0,
			7,
			`${pdfMoney(event.freedCapital, drift.currencyCode)} moved into the Investments target`,
			'',
			1,
			'L',
			false
		);
	}

	pdf.ln(8);
	pdf.setFont('Helvetica', 'I', 8);
	pdf.setTextColor(100, 107, 116);
	pdf.multiCell(
		0,
		5,
		'This deterministic report compares user-configured targets with recorded spending. Annual runway figures are simple twelve-month projections and do not assume market returns.',
		false
	);
	return pdf.output();
}
