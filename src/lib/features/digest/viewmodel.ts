// The web view of one weekly digest, the page every "Open in Norviq" link in
// the digest email lands on. Section anchors, order, titles and line text
// mirror norviq-backend-v2 internal/features/digest/render.go Sections, so
// the email's ?s=<anchor> always names a section that exists here.
import type { DigestPayload, DigestResponse } from './types.js';

export type DigestAnchor = 'holdings' | 'movers' | 'budget' | 'inflation' | 'earnings';

export interface DigestSection {
	anchor: DigestAnchor;
	title: string;
	lines: string[];
}

export interface DigestPageViewModel {
	headline: string;
	periodStart: string;
	periodEnd: string;
	narrative: string;
	sections: DigestSection[];
}

const numberFormat = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

const number = (value: number) => numberFormat.format(Math.abs(value));

function currencySymbol(code: string): string {
	switch (code.toUpperCase()) {
		case 'EUR':
			return '€';
		case 'USD':
			return '$';
		case 'GBP':
			return '£';
	}
	return code.toUpperCase();
}

export function money(value: number, currency: string): string {
	const symbol = currencySymbol(currency);
	const sign = value < 0 ? '-' : '';
	if ([...symbol].length === 1) return sign + symbol + number(value);
	return sign + number(value) + ' ' + symbol;
}

const signedMoney = (value: number, currency: string) =>
	(value > 0 ? '+' : '') + money(value, currency);

export const percent = (value: number) => (value < 0 ? '-' : '') + number(value) + '%';

const signedPercent = (value: number) => (value > 0 ? '+' : '') + percent(value);

function hourLabel(hour: string | null | undefined): string {
	if (hour === 'bmo') return ' (before open)';
	if (hour === 'amc') return ' (after close)';
	return '';
}

export function buildSections(p: DigestPayload): DigestSection[] {
	const out: DigestSection[] = [];
	const holdings = p.holdings ?? [];
	if (holdings.length > 0) {
		const lines = holdings.map((m) => {
			let line = signedMoney(m.change, m.currency);
			if (m.changePercent != null) line += ' (' + signedPercent(m.changePercent) + ')';
			return line + ', now ' + money(m.endValue, m.currency);
		});
		if (p.pricedPositions < p.totalPositions) {
			lines.push(
				`Based on ${p.pricedPositions} of ${p.totalPositions} holdings with prices this week.`
			);
		}
		out.push({ anchor: 'holdings', title: 'Your holdings this week', lines });
	}
	const movers = p.movers ?? [];
	if (movers.length > 0) {
		const lines = movers.map((m) => {
			let line =
				m.symbol +
				' ' +
				signedPercent(m.changePercent) +
				': ' +
				signedMoney(m.contribution, m.currency);
			if (m.why) line += '. ' + m.why;
			return line;
		});
		out.push({ anchor: 'movers', title: 'Top movers', lines });
	}
	if (p.budget) {
		const b = p.budget;
		const lines = (b.lines ?? []).map((l) => {
			const direction = l.drift > 0 ? 'over' : 'under';
			return `${l.title}: ${money(Math.abs(l.drift), b.currency)} ${direction} (${money(l.actual, b.currency)} of ${money(l.target, b.currency)})`;
		});
		out.push({ anchor: 'budget', title: 'Spending vs budget', lines });
	}
	if (p.inflation) {
		const i = p.inflation;
		out.push({
			anchor: 'inflation',
			title: 'Your inflation',
			lines: [
				`Yours: ${percent(i.personalRate)} vs official ${percent(i.officialRate)} (${i.country}, ${i.asOf}).`
			]
		});
	}
	const earnings = p.earnings ?? [];
	if (earnings.length > 0) {
		out.push({
			anchor: 'earnings',
			title: 'Next week',
			lines: earnings.map((e) => `${e.symbol} reports on ${e.date}${hourLabel(e.hour)}`)
		});
	}
	return out;
}

export function buildDigestPage(resp: DigestResponse): DigestPageViewModel {
	return {
		headline: resp.headline,
		periodStart: resp.periodStart,
		periodEnd: resp.periodEnd,
		narrative: resp.narrative ?? '',
		sections: buildSections(resp.payload)
	};
}

const ANCHORS: readonly string[] = ['holdings', 'movers', 'budget', 'inflation', 'earnings'];

/** The ?s= section to scroll to, only when it names a known anchor. */
export function focusAnchor(raw: string | null): DigestAnchor | null {
	return raw && ANCHORS.includes(raw) ? (raw as DigestAnchor) : null;
}
