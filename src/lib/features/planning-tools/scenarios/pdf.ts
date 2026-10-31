// Port of norviq-web internal/handlers/scenario_pdf.go writeScenarioPDF.
//
// Drawn with the fpdf subset in features/money/pdf (same coordinates, same
// arithmetic). Differences from Go: the document Info dictionary carries only
// a Producer (Go also set Title "Norviq scenario report" and Author "Norviq"),
// and non-ASCII text is mapped to WinAnsi instead of printed as mojibake.
import { formatFloat } from '#lib/format.js';
import { Fpdf } from '#lib/features/money/pdf/fpdf.js';
import type { ScenarioJSON, ScenarioRun } from './types.js';
import { goSprint, numberFrom, objectArray, objectFrom, signedFixed, textFrom } from './view.js';

type Obj = Record<string, unknown>;

/** time.Now().UTC().Format(time.RFC3339) */
const rfc3339Now = (now: Date) => now.toISOString().replace(/\.\d{3}Z$/, 'Z');

function metricLine(pdf: Fpdf, label: string, value: string) {
	pdf.cellFormat(55, 6, label, '', 0, 'L', false);
	pdf.setFont('Helvetica', 'B', 10);
	pdf.cellFormat(0, 6, value, '', 1, 'L', false);
	pdf.setFont('Helvetica', '', 10);
}

function drawLines(
	pdf: Fpdf,
	values: number[],
	x: number,
	y: number,
	width: number,
	height: number,
	minimum: number,
	span: number
) {
	for (let index = 1; index < values.length; index++) {
		const x1 = x + (width * (index - 1)) / (values.length - 1);
		const x2 = x + (width * index) / (values.length - 1);
		const y1 = y + height - ((values[index - 1] - minimum) / span) * height;
		const y2 = y + height - ((values[index] - minimum) / span) * height;
		pdf.line(x1, y1, x2, y2);
	}
}

function drawTimeline(pdf: Fpdf, points: Obj[]) {
	const width = 170;
	const height = 48;
	const x = pdf.getX();
	const y = pdf.getY() + 2;
	const values = points.map((point) => numberFrom(point, 'value'));
	let minimum = values[0];
	let maximum = values[0];
	for (const value of values.slice(1)) {
		if (value < minimum) minimum = value;
		if (value > maximum) maximum = value;
	}
	let span = maximum - minimum;
	if (span === 0) span = 1;
	pdf.setDrawColor(220, 225, 230);
	pdf.rect(x, y, width, height, 'D');
	pdf.setDrawColor(18, 140, 105);
	pdf.setLineWidth(0.6);
	drawLines(pdf, values, x, y, width, height, minimum, span);
	pdf.setY(y + height + 2);
}

function drawPercentileFan(pdf: Fpdf, points: Obj[]) {
	const series: number[][] = [[], [], []];
	for (const point of points) {
		series[0].push(numberFrom(point, 'p10'));
		series[1].push(numberFrom(point, 'p50'));
		series[2].push(numberFrom(point, 'p90'));
	}
	const width = 170;
	const height = 48;
	const x = pdf.getX();
	const y = pdf.getY() + 2;
	let minimum = series[0][0];
	let maximum = series[0][0];
	for (const values of series) {
		for (const value of values) {
			if (value < minimum) minimum = value;
			if (value > maximum) maximum = value;
		}
	}
	let span = maximum - minimum;
	if (span === 0) span = 1;
	pdf.setDrawColor(220, 225, 230);
	pdf.rect(x, y, width, height, 'D');
	const colors: [number, number, number][] = [
		[125, 170, 155],
		[18, 140, 105],
		[125, 170, 155]
	];
	series.forEach((values, seriesIndex) => {
		pdf.setDrawColor(...colors[seriesIndex]);
		pdf.setLineWidth(seriesIndex === 1 ? 0.7 : 0.35);
		drawLines(pdf, values, x, y, width, height, minimum, span);
	});
	pdf.setY(y + height + 2);
}

function ensurePDFSpace(pdf: Fpdf, height: number) {
	if (pdf.getY() + height > 260) pdf.addPage();
}

function writeObjectTable(pdf: Fpdf, title: string, rows: Obj[]) {
	if (rows.length === 0) return;
	pdf.setFont('Helvetica', 'B', 13);
	pdf.cellFormat(0, 8, title, '', 1, 'L', false);
	pdf.setFont('Helvetica', '', 9);
	for (const row of rows) {
		ensurePDFSpace(pdf, 12);
		pdf.cellFormat(90, 6, textFrom(row, 'key'), 'B', 0, 'L', false);
		pdf.cellFormat(35, 6, formatFloat(numberFrom(row, 'amount'), 2), 'B', 0, 'R', false);
		pdf.cellFormat(
			35,
			6,
			formatFloat(numberFrom(row, 'percentage_points') * 100, 2) + '%',
			'B',
			1,
			'R',
			false
		);
	}
	pdf.ln(4);
}

function writeAssumptions(pdf: Fpdf, values: Obj) {
	const keys = Object.keys(values).sort();
	if (keys.length === 0) return;
	ensurePDFSpace(pdf, 20);
	pdf.setFont('Helvetica', 'B', 13);
	pdf.cellFormat(0, 8, 'Assumptions', '', 1, 'L', false);
	pdf.setFont('Helvetica', '', 9);
	for (const key of keys) {
		ensurePDFSpace(pdf, 10);
		pdf.cellFormat(75, 6, key, 'B', 0, 'L', false);
		pdf.cellFormat(0, 6, goSprint(values[key]), 'B', 1, 'L', false);
	}
	pdf.ln(4);
}

function writeWarnings(pdf: Fpdf, rows: Obj[]) {
	if (rows.length === 0) return;
	pdf.setFont('Helvetica', 'B', 13);
	pdf.cellFormat(0, 8, 'Data-quality and proxy warnings', '', 1, 'L', false);
	pdf.setFont('Helvetica', '', 9);
	for (const warning of rows) {
		ensurePDFSpace(pdf, 12);
		pdf.multiCell(0, 5, '- ' + textFrom(warning, 'message'), false);
	}
}

/** writeScenarioPDF(w, run, result). */
export function buildScenarioPDF(
	run: ScenarioRun,
	result: ScenarioJSON,
	now = new Date()
): Uint8Array {
	const pdf = new Fpdf();
	// fpdf.New: auto page break on, bottom margin 2 cm.
	pdf.setAutoPageBreak(true, 20);
	pdf.setMargins(18, 18, 18);
	pdf.addPage();
	pdf.setFont('Helvetica', 'B', 22);
	pdf.cellFormat(0, 12, 'Scenario stress-test report', '', 1, 'L', false);
	pdf.setFont('Helvetica', '', 9);
	pdf.setTextColor(95, 105, 115);
	pdf.cellFormat(0, 6, 'Private report generated ' + rfc3339Now(now), '', 1, 'L', false);
	pdf.cellFormat(
		0,
		6,
		'Engine ' + run.engineVersion + ' | catalog ' + run.catalogVersion + ' | seed ' + run.seed,
		'',
		1,
		'L',
		false
	);
	pdf.ln(5);

	pdf.setTextColor(20, 25, 30);
	pdf.setFont('Helvetica', 'B', 13);
	pdf.cellFormat(0, 8, 'Highlights', '', 1, 'L', false);
	pdf.setFont('Helvetica', '', 10);
	metricLine(pdf, 'Ending value', formatFloat(numberFrom(result, 'ending_value'), 2));
	metricLine(
		pdf,
		'Portfolio change',
		signedFixed(numberFrom(result, 'portfolio_change_percent') * 100, 1) + '%'
	);
	metricLine(
		pdf,
		'Maximum drawdown',
		formatFloat(numberFrom(result, 'maximum_drawdown') * 100, 1) + '%'
	);
	const optional = (key: string) =>
		typeof result[key] === 'number' ? (result[key] as number) : null;
	const goalDelay = optional('goal_delay_months');
	if (goalDelay !== null) metricLine(pdf, 'Goal delay (months)', formatFloat(goalDelay, 1));
	const contributionDelta = optional('contribution_delta');
	if (contributionDelta !== null)
		metricLine(pdf, 'Contribution delta / mo', signedFixed(contributionDelta, 2));
	const recovery = optional('recovery_months');
	if (recovery !== null) metricLine(pdf, 'Recovery (months)', formatFloat(recovery, 1));
	const expenseImpact = optional('expense_impact_monthly');
	if (expenseImpact !== null) metricLine(pdf, 'Expense cut / mo', signedFixed(expenseImpact, 2));
	metricLine(
		pdf,
		'Goal probability',
		formatFloat(numberFrom(result, 'goal_probability') * 100, 1) + '%'
	);
	metricLine(pdf, 'Expected shortfall', formatFloat(numberFrom(result, 'expected_shortfall'), 2));
	pdf.ln(5);

	const timeline = objectArray(result.timeline);
	const bands = objectArray(result.percentile_bands);
	if (timeline.length > 1) {
		pdf.setFont('Helvetica', 'B', 13);
		pdf.cellFormat(0, 8, 'Portfolio value path', '', 1, 'L', false);
		drawTimeline(pdf, timeline);
		pdf.ln(5);
	} else if (bands.length > 1) {
		pdf.setFont('Helvetica', 'B', 13);
		pdf.cellFormat(0, 8, 'Portfolio percentile fan', '', 1, 'L', false);
		drawPercentileFan(pdf, bands);
		pdf.ln(5);
	}

	writeObjectTable(pdf, 'Holding impact', objectArray(result.holding_contributions));
	writeObjectTable(pdf, 'Asset-class impact', objectArray(result.class_contributions));
	writeAssumptions(pdf, objectFrom(result.assumptions));
	writeWarnings(pdf, objectArray(result.warnings));

	pdf.setY(-30);
	pdf.setFont('Helvetica', 'I', 8);
	pdf.setTextColor(95, 105, 115);
	pdf.multiCell(
		0,
		4,
		'Educational scenario analysis only. This report is not investment, tax, or financial advice. Model outputs depend on assumptions and data quality; actual outcomes may differ materially.',
		false
	);
	return pdf.output();
}
