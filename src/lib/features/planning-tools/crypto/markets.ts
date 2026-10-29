// Port of the pure parts of norviq-web internal/handlers/crypto_markets.go
// (formatting, timeframe options, buildCryptoMarketsVM) and crypto_data.go
// (cryptoChangePercent), plus handlers.formatShares. Client-safe: the
// Markets/Bubbles tab builds its view model in the browser from
// /api/v1/crypto/markets, the one backend call Go's fragment handler made.
import { formatCompactCurrency, formatFloat, formatSignedPercent, formatWithCommas, changeClass, goRound } from '#lib/format.js';
import { shortDate } from '#lib/features/settings-admin/go-time.js';
import type { BubbleNode, HeatmapTile } from '#lib/charts/index.js';
import type { AthRowVM, CoinRowVM, CryptoMarketCoin, CryptoMarketsResponse, MarketsVM, ToggleOption } from './types.js';

/** cryptoTimeframes: the selector order; values are the backend's `timeframe`. */
export const cryptoTimeframes = [
	{ value: '1d', label: '1D' },
	{ value: '1w', label: '1W' },
	{ value: '1m', label: '1M' },
	{ value: 'ytd', label: 'YTD' },
	{ value: '1y', label: '1Y' },
	{ value: 'all', label: 'All' }
] as const;

/** cryptoBubbleLimit */
export const cryptoBubbleLimit = 100;

export function normalizeCryptoTimeframe(raw: string | null | undefined): string {
	const v = (raw ?? '').trim().toLowerCase();
	return cryptoTimeframes.some((tf) => tf.value === v) ? v : '1d';
}

export function cryptoTimeframeLabel(value: string): string {
	return cryptoTimeframes.find((tf) => tf.value === value)?.label ?? '1D';
}

export const normalizeCryptoMarketsView = (raw: string | null | undefined) => (raw === 'bubbles' ? 'bubbles' : 'market');

export const normalizeBubbleSize = (raw: string | null | undefined) => (raw === 'change' ? 'change' : 'cap');

/** cryptoTabURL: the hx-push-url of a toggle (url.Values.Encode sorts keys). */
export function cryptoTabURL(view: string, timeframe: string, size: string): string {
	if (view === 'bubbles') return `/crypto/bubbles?size=${encodeURIComponent(size)}&tf=${encodeURIComponent(timeframe)}`;
	return `/crypto/market?tf=${encodeURIComponent(timeframe)}`;
}

/** The backend request Go's fragment handler made (GetCryptoMarkets). */
export function cryptoMarketsPath(timeframe: string, limit = cryptoBubbleLimit): string {
	return `/api/v1/crypto/markets?timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`;
}

export function cryptoCoinHref(fmpSymbol: string | null | undefined): string {
	if (!fmpSymbol) return '';
	return '/crypto/coin/' + encodeURIComponent(fmpSymbol);
}

/** cryptoChangePercent: the short quote's absolute change as a percentage of the previous price. */
export function cryptoChangePercent(price: number, change: number): number | null {
	const prev = price - change;
	if (prev <= 0) return null;
	return (change / prev) * 100;
}

/** handlers.formatShares */
export const formatShares = (shares: number) => (shares % 1 === 0 ? formatFloat(shares, 0) : formatFloat(shares, 2));

/** formatCryptoPrice keeps two significant digits for sub-cent coins. */
export function formatCryptoPrice(price: number): string {
	if (price >= 1) {
		const [intPart, frac] = formatFloat(price, 2).split('.');
		let out = '';
		for (let i = 0; i < intPart.length; i++) {
			if (i > 0 && (intPart.length - i) % 3 === 0) out += ',';
			out += intPart[i];
		}
		return '$' + out + '.' + frac;
	}
	if (price >= 0.01) return '$' + formatFloat(price, 4);
	if (price > 0) {
		const decimals = Math.trunc(-Math.floor(Math.log10(price))) + 1;
		return '$' + formatFloat(price, decimals);
	}
	return '$0.00';
}

/** formatMultiple: a large gain as a multiple ("1,244x"), a modest one as "%+.0f%%". */
export function formatMultiple(pct: number): string {
	if (pct >= 1000) return formatWithCommas(goRound(1 + pct / 100)) + 'x';
	const s = formatFloat(pct, 0);
	return (s.startsWith('-') ? s : '+' + s) + '%';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** time.Format("Jan 2, 15:04 UTC") in UTC. */
function asOfLabel(raw: string): string {
	const d = new Date(raw);
	if (Number.isNaN(d.getTime())) return '';
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

/** timeframeOptions: `supported` null means "unknown", so nothing is disabled. */
export function timeframeOptions(view: string, current: string, size: string, supported: readonly string[] | null): ToggleOption[] {
	return cryptoTimeframes.map((tf) => ({
		label: tf.label,
		pushURL: cryptoTabURL(view, tf.value, size),
		active: tf.value === current,
		disabled: supported !== null && !supported.includes(tf.value) && tf.value !== current
	}));
}

/** The fragment's fallback when the backend call fails. */
export function unavailableMarketsVM(view: string, timeframe: string, size: string): MarketsVM {
	return {
		view,
		timeframeLabel: cryptoTimeframeLabel(timeframe),
		timeframes: timeframeOptions(view, timeframe, size, null),
		sizeOptions: [],
		asOf: '',
		isStale: false,
		attribution: '',
		totalMarketCap: '',
		btcDominance: '',
		advancers: 0,
		decliners: 0,
		heatmap: null,
		bubbles: null,
		gainersTitle: '',
		losersTitle: '',
		gainers: [],
		losers: [],
		recentAths: [],
		nearAth: [],
		drawdowns: [],
		unavailable: true
	};
}

function mapCoinRows(coins: readonly CryptoMarketCoin[] | null): CoinRowVM[] {
	return (coins ?? []).map((coin) => {
		const row: CoinRowVM = {
			symbol: coin.symbol,
			name: coin.name,
			href: cryptoCoinHref(coin.fmpSymbol),
			price: formatCryptoPrice(coin.price),
			change: '',
			changeClass: '',
			sparkline: null
		};
		if (coin.changePct != null) {
			row.change = formatSignedPercent(coin.changePct);
			row.changeClass = changeClass(coin.changePct);
		}
		const spark = coin.sparkline7d ?? [];
		if (spark.length >= 2) {
			row.sparkline = {
				points: spark.map((value) => ({ label: '', value })),
				tone: spark[spark.length - 1] < spark[0] ? 'negative' : 'positive'
			};
		}
		return row;
	});
}

function mapAthRows(coins: readonly CryptoMarketCoin[] | null): AthRowVM[] {
	return (coins ?? []).map((coin) => ({
		symbol: coin.symbol,
		name: coin.name,
		href: cryptoCoinHref(coin.fmpSymbol),
		fromATH: coin.athChangePct != null ? formatFloat(coin.athChangePct, 1) + '%' : '',
		athDate: coin.athDate ? 'High ' + shortDate(coin.athDate) : '',
		sinceATL: coin.atlChangePct != null ? formatMultiple(coin.atlChangePct) : ''
	}));
}

/** buildCryptoMarketsVM */
export function buildCryptoMarketsVM(resp: CryptoMarketsResponse, view: string, timeframe: string, size: string): MarketsVM {
	const label = cryptoTimeframeLabel(timeframe);
	const coins = resp.coins ?? [];
	const vm: MarketsVM = {
		...unavailableMarketsVM(view, timeframe, size),
		timeframes: timeframeOptions(view, timeframe, size, resp.supportedTimeframes ?? null),
		asOf: asOfLabel(resp.asOf),
		isStale: resp.isStale,
		advancers: resp.summary?.advancers ?? 0,
		decliners: resp.summary?.decliners ?? 0,
		unavailable: coins.length === 0,
		gainersTitle: 'Top performers',
		losersTitle: 'Worst performers'
	};
	if (timeframe === 'all') {
		vm.gainersTitle = 'Closest to all-time high';
		vm.losersTitle = 'Furthest from all-time high';
	}
	if (resp.attribution) vm.attribution = resp.attribution;
	if (resp.summary?.totalMarketCap != null) vm.totalMarketCap = formatCompactCurrency(resp.summary.totalMarketCap);
	if (resp.summary?.btcDominancePct != null) vm.btcDominance = formatFloat(resp.summary.btcDominancePct, 1) + '%';

	const colorMode = resp.colorMode === 'athDistance' ? 'athDistance' : 'change';

	if (view === 'bubbles') {
		vm.sizeOptions = ['cap', 'change'].map((value) => ({
			label: value === 'change' ? label + ' move' : 'Market cap',
			pushURL: cryptoTabURL(view, timeframe, value),
			active: value === size,
			disabled: false
		}));
		const nodes: BubbleNode[] = coins
			.filter((coin) => coin.changePct != null)
			.map((coin) => ({
				symbol: coin.symbol,
				name: coin.name,
				marketCap: coin.marketCap ?? 0,
				changePct: coin.changePct as number,
				href: cryptoCoinHref(coin.fmpSymbol)
			}));
		vm.bubbles = {
			id: `crypto_bubbles_${timeframe}_${size}`,
			nodes,
			scaleMaxPct: resp.colorScaleMaxPct,
			periodLabel: label,
			colorMode,
			sizeBy: size === 'change' ? 'change' : 'marketCap'
		};
		return vm;
	}

	const tiles: HeatmapTile[] = coins
		.filter((coin) => coin.changePct != null && coin.marketCap != null && coin.marketCap > 0)
		.map((coin) => ({
			symbol: coin.symbol,
			name: coin.name,
			sector: coin.sector,
			marketCap: coin.marketCap as number,
			changePct: coin.changePct as number
		}));
	vm.heatmap = { id: 'crypto_heatmap_' + timeframe, tiles, scaleMaxPct: resp.colorScaleMaxPct, periodLabel: label, colorMode };
	vm.gainers = mapCoinRows(resp.gainers);
	vm.losers = mapCoinRows(resp.losers);
	vm.recentAths = mapAthRows(resp.athBoard?.recentAths ?? null);
	vm.nearAth = mapAthRows(resp.athBoard?.nearAth ?? null);
	vm.drawdowns = mapAthRows(resp.athBoard?.deepestDrawdowns ?? null);
	return vm;
}
