// Broker import entry: which import methods each broker offers.

export type ImportMethod = 'screenshot' | 'ask-q' | 'csv';

export interface BrokerGuide {
	id: string;
	name: string;
	methods: ImportMethod[];
}

export const BROKERS: BrokerGuide[] = [
	{ id: 'ibkr', name: 'IBKR', methods: ['screenshot', 'ask-q'] },
	{ id: 'degiro', name: 'DEGIRO', methods: ['screenshot', 'ask-q'] },
	{ id: 'trading212', name: 'Trading 212', methods: ['screenshot', 'ask-q'] },
	{ id: 'revolut', name: 'Revolut', methods: ['screenshot', 'ask-q'] },
	{ id: 'other', name: 'Other broker (CSV)', methods: ['csv', 'screenshot', 'ask-q'] }
];

export const METHOD_LABELS: Record<ImportMethod, string> = {
	screenshot: 'Screenshots',
	'ask-q': 'Ask Q',
	csv: 'CSV file'
};

export const ASK_Q_GUIDE =
	'Attach your screenshots to Q and ask it to update your holdings. You review every row before anything is saved.';

export function screenshotGuide(broker: BrokerGuide): string {
	const who = broker.id === 'other' ? "your broker's" : `the ${broker.name}`;
	return `Open your positions list in ${who} app or website and take screenshots that show every holding. You can import up to 3 at a time.`;
}

export function methodHref(method: ImportMethod, portfolioListId: string | null): string {
	if (method === 'ask-q') return '/assistant';
	const base = method === 'csv' ? '/onboarding/import/csv' : '/portfolio/import/screenshot';
	return portfolioListId
		? `${base}?portfolio_list_id=${encodeURIComponent(portfolioListId)}`
		: base;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A portfolio id fit to forward to the backend: a UUID, otherwise '' (the default list). */
export function portfolioListIdOrEmpty(raw: string | null | undefined): string {
	const id = (raw ?? '').trim();
	return UUID_RE.test(id) ? id : '';
}
