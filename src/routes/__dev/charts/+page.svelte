<!--
	DEV ONLY gallery: every #lib/charts builder with sample data. The toggle
	flips html.dark, so each chart can be checked in both appearances (EChart
	re-themes through its MutationObserver, as it does for the real toggle).
	Charts sit inside .app-page-content, where the Go web applied its theme.
-->
<script lang="ts">
	import EChart from '#lib/charts/EChart.svelte';
	import DonutSVG from '#lib/charts/DonutSVG.svelte';
	import GrowthSparkline from '#lib/charts/GrowthSparkline.svelte';
	import {
		activityHeatmap,
		allocationPie,
		candlestick,
		cryptoBubbles,
		marketHeatmap,
		marketHeatmapWithOptions,
		multiSeriesBar,
		multiSeriesLine,
		priceLine,
		sectorGainsBar,
		sentimentHistoryLine,
		sparkline,
		spendingLine,
		spendPillarBar,
		wealthLine,
		type ChartSpec
	} from '#lib/charts/index.js';

	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
	const wave = (base: number, amp: number, n = months.length) =>
		Array.from({ length: n }, (_, i) =>
			Math.round(base + amp * Math.sin(i / 1.6) + i * amp * 0.15)
		);

	const activity: Record<string, number> = {};
	for (let i = 0; i < 120; i++) {
		const d = new Date(Date.UTC(2026, 4, 1 + i));
		if ((i * 7) % 5 !== 0) activity[d.toISOString().slice(0, 10)] = (i * 13) % 9;
	}

	const charts: Array<[string, ChartSpec | null]> = [
		['wealthLine', wealthLine('wealth-chart', months, wave(100000, 8000))],
		['spendingLine', spendingLine('spending-chart', months, wave(2400, 400))],
		['priceLine', priceLine('coin-price', months, wave(62000, 5000))],
		[
			'allocationPie',
			allocationPie(
				'allocation-chart',
				[
					'Tech',
					'Health',
					'Energy',
					'Finance',
					'Utilities',
					'Materials',
					'Real estate',
					'Telecom',
					'Staples',
					'Other'
				],
				[32, 18, 12, 10, 8, 6, 5, 4, 3, 2]
			)
		],
		[
			'allocationPie (expenses)',
			allocationPie('expenses-donut', ['Housing', 'Food', 'Transport'], [1200, 450, 300])
		],
		[
			'sectorGainsBar',
			sectorGainsBar(
				'sector-gains',
				['Tech', 'Health', 'Energy', 'Finance'],
				[4200, -800, 1300, -250]
			)
		],
		['sparkline (up)', sparkline('spark-aapl', [10, 11, 10.5, 12, 12.4, 13])],
		['sparkline (down)', sparkline('spark-tsla', [13, 12.5, 12.8, 11, 10.2])],
		[
			'candlestick',
			candlestick(
				'candle-chart',
				['d1', 'd2', 'd3', 'd4', 'd5'],
				[
					[10, 12, 9, 13],
					[12, 11, 10, 12.5],
					[11, 13, 10.5, 13.5],
					[13, 12.2, 11.8, 13.4],
					[12.2, 14, 12, 14.2]
				]
			)
		],
		[
			'sentimentHistoryLine',
			sentimentHistoryLine('sentiment-history', months, [12, 30, -5, 18, 42, 25, -12, 8])
		],
		[
			'multiSeriesLine (compact)',
			multiSeriesLine(
				'builder-line',
				['FY2021', 'FY2022', 'FY2023', 'FY2024'],
				[
					{ name: 'AAPL · Revenue', values: [365e9, 394e9, 383e9, 391e9] },
					{ name: 'MSFT · Revenue', values: [168e9, 198e9, null, 245e9] }
				]
			)
		],
		[
			'multiSeriesBar (percent)',
			multiSeriesBar(
				'margin-bar',
				['FY2022', 'FY2023', 'FY2024'],
				[
					{ name: 'Gross margin', format: 'percent', values: [0.43, 0.44, 0.46] },
					{ name: 'Net margin', format: 'percent', values: [0.25, 0.25, 0.24] }
				]
			)
		],
		[
			'marketHeatmap',
			marketHeatmap('stocks-heatmap', [
				{ symbol: 'AAPL', name: 'Apple', sector: 'Tech', marketCap: 3.4e12, changePct: 1.2 },
				{ symbol: 'MSFT', name: 'Microsoft', sector: 'Tech', marketCap: 3.1e12, changePct: -0.6 },
				{ symbol: 'NVDA', name: 'Nvidia', sector: 'Tech', marketCap: 2.9e12, changePct: 3.4 },
				{ symbol: 'JPM', name: 'JPMorgan', sector: 'Finance', marketCap: 6e11, changePct: -1.8 },
				{ symbol: 'XOM', name: 'Exxon', sector: 'Energy', marketCap: 4.6e11, changePct: 0.2 },
				{ symbol: 'LLY', name: 'Eli Lilly', sector: 'Health', marketCap: 7e11, changePct: -2.9 }
			])
		],
		[
			'marketHeatmapWithOptions (ATH distance)',
			marketHeatmapWithOptions(
				'crypto-ath',
				[
					{ symbol: 'BTC', name: 'Bitcoin', sector: 'Layer 1', marketCap: 1.2e12, changePct: -8 },
					{ symbol: 'ETH', name: 'Ethereum', sector: 'Layer 1', marketCap: 4e11, changePct: -35 },
					{ symbol: 'UNI', name: 'Uniswap', sector: 'DeFi', marketCap: 6e9, changePct: -70 }
				],
				{ scaleMaxPct: 90, periodLabel: 'ATH', colorMode: 'athDistance', height: 320 }
			)
		],
		[
			'cryptoBubbles',
			cryptoBubbles(
				'crypto-bubbles-1w',
				[
					{ symbol: 'BTC', name: 'Bitcoin', marketCap: 1.2e12, changePct: 3.2 },
					{ symbol: 'ETH', name: 'Ethereum', marketCap: 4e11, changePct: -2.1 },
					{ symbol: 'SOL', name: 'Solana', marketCap: 8e10, changePct: 9.4 },
					{ symbol: 'DOGE', name: 'Dogecoin', marketCap: 2e10, changePct: -6 },
					{ symbol: 'ADA', name: 'Cardano', marketCap: 1.5e10, changePct: 1.1 }
				],
				{ scaleMaxPct: 15, periodLabel: '1W', height: 360 }
			)
		],
		[
			'spendPillarBar',
			spendPillarBar('cc-pillars', [
				{ name: 'Fundamentals', value: 2400, colorVar: '--color-pillar-fundamentals' },
				{ name: 'Future you', value: 900, colorVar: '--color-pillar-future-you' },
				{ name: 'Fun', value: 450, colorVar: '--color-pillar-fun' }
			])
		],
		['activityHeatmap', activityHeatmap('cc-heatmap', '2026-05-01', '2026-08-28', activity)]
	];

	let dark = $state(false);
	function toggle() {
		dark = !document.documentElement.classList.contains('dark');
		document.documentElement.classList.toggle('dark', dark);
	}
</script>

<svelte:head><title>Charts gallery (dev)</title></svelte:head>

<div
	class="app-page-content"
	style="padding: 1.5rem; display: grid; gap: 1.5rem; background: var(--background); color: var(--foreground)"
>
	<header style="display: flex; gap: 1rem; align-items: center">
		<h1 style="font-size: 1.25rem; font-weight: 600">#lib/charts gallery</h1>
		<button type="button" class="btn" onclick={toggle}
			>Toggle dark (now {dark ? 'dark' : 'light'})</button
		>
	</header>

	{#each charts as [name, spec] (name)}
		<section style="border: 1px solid var(--border); border-radius: 12px; padding: 1rem">
			<h2 style="font-size: 0.875rem; margin-bottom: 0.5rem">{name} <code>#{spec?.id}</code></h2>
			{#if spec}<EChart {...spec} />{:else}<p>null</p>{/if}
		</section>
	{/each}

	<section
		style="border: 1px solid var(--border); border-radius: 12px; padding: 1rem; display: flex; gap: 2rem; align-items: center"
	>
		<div style="width: 160px">
			<h2 style="font-size: 0.875rem">DonutSVG</h2>
			<DonutSVG
				slices={[
					{ label: 'AAPL', weight: 45 },
					{ label: 'MSFT', weight: 30 },
					{ label: 'Cash', weight: 25 }
				]}
			/>
		</div>
		<div style="width: 220px">
			<h2 style="font-size: 0.875rem">GrowthSparkline</h2>
			<GrowthSparkline
				points={[
					{ label: '2021', value: 5 },
					{ label: '2022', value: 12 },
					{ label: '2023', value: -3 },
					{ label: '2024', value: 8 }
				]}
			/>
			<GrowthSparkline
				tone="negative"
				points={[
					{ label: '2021', value: 8 },
					{ label: '2022', value: 2 },
					{ label: '2023', value: -4 }
				]}
			/>
		</div>
	</section>
</div>
