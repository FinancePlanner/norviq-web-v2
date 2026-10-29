// Port of norviq-web internal/pages/landing (model.go, hero_cards.go,
// structured_data.go) and internal/landing/device.go. Pure; safe on server
// and client.

/** The 1200×630 share card. */
export const OGImagePath = '/static/images/og.png';

export interface LandingVM {
	appStoreURL: string;
	appStoreID: string;
	googlePlayURL: string;
	/** Canonical origin, no trailing slash (PUBLIC_BASE_URL). */
	publicBaseURL: string;
}

export function absoluteURL(vm: LandingVM, path: string): string {
	return vm.publicBaseURL ? vm.publicBaseURL + path : path;
}

// --- internal/landing/device.go ---

export const StayWebCookieName = 'norviq_stay_web';
export const StayWebQueryParam = 'web';

export function isIOSMobile(userAgent: string): boolean {
	const ua = userAgent.toLowerCase();
	return ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod');
}

// --- config.go helpers ---

/** AppStoreIDFromURL: the digits after the last "/id". */
export function appStoreIDFromURL(url: string): string {
	const i = url.lastIndexOf('/id');
	return i >= 0 ? url.slice(i + 3) : '';
}

/** GooglePlayListingURL: "" for the pre-launch store-search placeholder. */
export function googlePlayListingURL(url: string): string {
	const u = url.trim();
	return u.includes('play.google.com/store/search') ? '' : u;
}

// --- structured_data.go ---

const norviqXURL = 'https://x.com/NorviqPlanner';

/** Go json.Marshal: map keys sorted (struct-free maps only here), <>& escaped. */
function goJSON(value: unknown): string {
	const sortDeep = (v: unknown): unknown =>
		Array.isArray(v)
			? v.map(sortDeep)
			: v && typeof v === 'object'
				? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep((v as Record<string, unknown>)[k])]))
				: v;
	return JSON.stringify(sortDeep(value)).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

/** The JSON-LD @graph: the product, its publisher and the website. */
export function structuredData(vm: LandingVM): string {
	const home = absoluteURL(vm, '/');
	const orgID = home + '#organization';
	const siteID = home + '#website';
	const appID = home + '#app';
	const image = { '@type': 'ImageObject', url: absoluteURL(vm, OGImagePath), width: 1200, height: 630 };
	const sameAs = vm.appStoreURL ? [vm.appStoreURL, norviqXURL] : [norviqXURL];
	const app: Record<string, unknown> = {
		'@type': 'SoftwareApplication',
		'@id': appID,
		name: 'Norviq',
		url: home,
		applicationCategory: 'FinanceApplication',
		operatingSystem: 'iOS, Web',
		description:
			'Norviq keeps the vigil: wealth, spending, and the signals between. Portfolio, budgeting, and AI-powered signals in one private financial guardian.',
		image,
		screenshot: image,
		featureList: ['Portfolio and watchlists', 'Spending and budgets', 'AI-powered signals', 'MCP integrations'],
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		publisher: { '@id': orgID },
		isPartOf: { '@id': siteID },
		sameAs
	};
	if (vm.appStoreURL) {
		app.installUrl = vm.appStoreURL;
		app.downloadUrl = vm.appStoreURL;
	}
	const org = { '@type': 'Organization', '@id': orgID, name: 'Norviq', url: home, logo: image, sameAs };
	const site = {
		'@type': 'WebSite',
		'@id': siteID,
		url: home,
		name: 'Norviq',
		description: 'Norviq keeps the vigil: wealth, spending, and the signals between.',
		inLanguage: 'en',
		publisher: { '@id': orgID }
	};
	return goJSON({ '@context': 'https://schema.org', '@graph': [org, site, app] });
}

// --- hero_cards.go: the decorative card wall along the bottom of the hero ---

export type HeroCardKind = 'ticker' | 'networth' | 'budget' | 'insight' | 'receipt' | 'dividend' | 'tax' | 'shot';

export interface HeroCardLine {
	label: string;
	value: string;
}

export interface HeroCard {
	kind: HeroCardKind;
	title?: string;
	sub?: string;
	value?: string;
	delta?: string;
	up?: boolean;
	series?: number[];
	percent?: number;
	lines?: HeroCardLine[];
	note?: string;
	image?: string;
}

const L = (label: string, value: string): HeroCardLine => ({ label, value });

const heroCards: HeroCard[] = [
	{ kind: 'ticker', title: 'AAPL', sub: 'Apple', value: '$228.40', delta: '+1.8%', up: true, series: [4, 5, 4.6, 5.8, 5.4, 6.6, 6.2, 7.4, 7.1, 8.2] },
	{ kind: 'networth', title: 'Net worth', value: '€184,320', delta: '+€2,140 · 30d', up: true, series: [3, 3.4, 3.2, 4.1, 4.4, 4.2, 5.1, 5.6, 5.4, 6.3, 6.8] },
	{ kind: 'shot', image: '/static/images/screenshots/home.webp' },
	{ kind: 'ticker', title: 'VWCE', sub: 'FTSE All-World', value: '€132.06', delta: '+0.6%', up: true, series: [5, 5.2, 5.1, 5.5, 5.4, 5.8, 5.7, 6, 6.2, 6.3] },
	{ kind: 'budget', title: 'October budget', value: '€1,632', sub: 'of €2,400', percent: 68, lines: [L('Groceries', '€412'), L('Home', '€860'), L('Going out', '€190')] },
	{
		kind: 'insight',
		title: 'Why it moved',
		value: '−1.2% today',
		note: 'NVDA drove most of the drop after chip-export headlines.',
		lines: [L('NVDA', '−0.84%'), L('ASML', '−0.21%'), L('AAPL', '+0.12%')]
	},
	{ kind: 'ticker', title: 'BTC', sub: 'Bitcoin', value: '€58,210', delta: '−2.4%', up: false, series: [8, 7.6, 7.9, 7.1, 7.3, 6.5, 6.8, 6.1, 6.3, 5.8] },
	{
		kind: 'receipt',
		title: 'Receipt scanned',
		sub: 'Pingo Doce',
		value: '€24.83',
		note: 'Groceries',
		lines: [L('Fruit & veg', '8.40'), L('Bread', '2.15'), L('Olive oil', '9.99'), L('Coffee', '4.29')]
	},
	{ kind: 'shot', image: '/static/images/screenshots/portfolio.webp' },
	{ kind: 'ticker', title: 'NVDA', sub: 'NVIDIA', value: '$118.72', delta: '−3.1%', up: false, series: [7, 7.4, 6.9, 7.2, 6.4, 6.6, 5.9, 5.4, 5.6, 4.9] },
	{ kind: 'dividend', title: 'Dividend received', sub: 'VWRL', value: '+€38.12', up: true, lines: [L('Paid', '25 Sep'), L('Withheld', '€5.72'), L('ECB rate', '1.0712')] },
	{
		kind: 'tax',
		title: 'IBKR → Anexo J',
		sub: 'Tax year 2025',
		lines: [L('Dividends · 8A', '€412.80'), L('Gains · 9.2A', '€1,206.44'), L('Trades, FIFO', '37')],
		note: 'PDF ready'
	},
	{ kind: 'ticker', title: 'MSFT', sub: 'Microsoft', value: '$431.15', delta: '+0.9%', up: true, series: [5, 5.3, 5.1, 5.6, 5.9, 5.7, 6.1, 6.4, 6.3, 6.7] },
	{ kind: 'shot', image: '/static/images/screenshots/expenses.webp' },
	{ kind: 'ticker', title: 'ASML', sub: 'ASML Holding', value: '€684.30', delta: '−0.7%', up: false, series: [6, 6.3, 6.1, 6.4, 6, 5.8, 6, 5.6, 5.7, 5.5] },
	{ kind: 'shot', image: '/static/images/screenshots/technical_analysis.webp' }
];

const heroFrontRow = [0, 13, 3, 11, 4, 9, 5, 1, 7, 6, 2, 10, 12, 8, 14];
const heroBackRow = [10, 5, 15, 6, 7, 2, 12, 11, 8, 4, 0, 13, 3, 1];

export interface HeroWallSlot {
	card: HeroCard;
	style: string;
	class: string;
}

const heroFrontCount = 15;
const heroBackCount = 14;
const heroStep = 100 / 14;

function heroFrontVisibility(i: number): string {
	if ([0, 4, 7, 10, 14].includes(i)) return '';
	if ([2, 5, 9, 12].includes(i)) return 'hero-wall-md';
	return 'hero-wall-lg';
}

const heroSwayDelay = (i: number) => (i % 5) * 0.7;

/** Go's %.Nf: round half away from zero is close enough for these values; toFixed matches fmt here. */
function fixed(v: number, n: number): string {
	const s = v.toFixed(n);
	return s === '-0' + (n ? '.' + '0'.repeat(n) : '') ? s.slice(1) : s;
}

function heroSlotStyle(x: number, rot: number, y: number, z: number, delay: number): string {
	return `--hero-x:${fixed(x, 2)}%;--hero-rot:${fixed(rot, 1)}deg;--hero-y:${fixed(y, 1)}%;--hero-z:${z};--hero-delay:${fixed(delay, 1)}s`;
}

export function heroFrontSlots(): HeroWallSlot[] {
	return Array.from({ length: heroFrontCount }, (_, i) => {
		const d = (i - 7) / 7;
		const z = 20 - Math.abs(i - 7);
		return {
			card: heroCards[heroFrontRow[i]],
			style: heroSlotStyle(i * heroStep, 21 - 3 * i, 20 + 16.8 * d * d, z, heroSwayDelay(i)),
			class: heroFrontVisibility(i)
		};
	});
}

export function heroBackSlots(): HeroWallSlot[] {
	return Array.from({ length: heroBackCount }, (_, j) => {
		const d = (j - 6.5) / 6.5;
		return {
			card: heroCards[heroBackRow[j]],
			style: heroSlotStyle(heroStep / 2 + j * heroStep, 15.6 - 2.4 * j, -14.6 + 18.6 * d * d, 1, heroSwayDelay(j + 2)),
			class: ''
		};
	});
}

/** sparklinePaths: line and closed area paths in a 100×32 viewBox. */
export function sparklinePaths(series: number[] | undefined): { line: string; area: string } {
	if (!series || series.length < 2) return { line: '', area: '' };
	const lo = Math.min(...series);
	const hi = Math.max(...series);
	const span = hi - lo || 1;
	const line = series
		.map((v, i) => {
			const x = (i * 100) / (series.length - 1);
			const y = 28 - ((v - lo) / span) * 24;
			return (i === 0 ? 'M' : ' L') + fixed(x, 1) + ' ' + fixed(y, 1);
		})
		.join('');
	return { line, area: line + ' L100 32 L0 32 Z' };
}

/** budgetRingDash: the ring's circumference is 100, so the dash is the percentage. */
export function budgetRingDash(percent: number): string {
	return `${Math.max(0, Math.min(100, percent))} 100`;
}

export const heroToneClass = (up: boolean) => (up ? 'is-up' : 'is-down');
