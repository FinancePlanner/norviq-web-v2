<script lang="ts">
	// pages/portfolio/row.templ PositionRow. The ⋯ menu items did hx-get into
	// #position-action-panel and opened position-action-dialog; `onaction`
	// gets the same URL and does both.
	import { Icon, NativeButton, SentimentBadge } from '#lib/components/norviq/index.js';
	import EChart from '#lib/charts/EChart.svelte';
	import { sparkline } from '#lib/charts/index.js';
	import PositionQuote from './PositionQuote.svelte';
	import { positionActionURL } from './client.js';
	import type { PositionQuoteVM, PositionRowVM } from './types.js';

	let {
		row,
		quote,
		isPro,
		rangeKey,
		onaction
	}: {
		row: PositionRowVM;
		/** The latest polled quote for this row, when one has landed. */
		quote?: PositionQuoteVM;
		isPro: boolean;
		rangeKey: string;
		onaction: (url: string) => void;
	} = $props();

	let open = $state(false);
	let pos = $state({ top: '0px', left: '0px' });
	let menuRoot = $state<HTMLDivElement | null>(null);
	let menubtn = $state<HTMLButtonElement | null>(null);

	const spark = $derived(row.sparkline ? sparkline(row.sparklineID, row.sparkline) : null);

	function toggle() {
		if (!open && menubtn) {
			const r = menubtn.getBoundingClientRect();
			pos = { top: r.bottom + 4 + 'px', left: Math.max(0, r.right - 168) + 'px' };
		}
		open = !open;
	}

	function act(path: string) {
		open = false;
		onaction(positionActionURL(path, rangeKey));
	}

	function onWindowClick(e: MouseEvent) {
		if (open && menuRoot && !menuRoot.contains(e.target as Node)) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} />

<div
	class="portfolio-row"
	data-symbol={row.symbol}
	data-gain={row.rawGain.toFixed(6)}
	data-weight={row.rawWeight.toFixed(6)}
	data-category={row.category}
>
	<div class="portfolio-row-layout">
		<a href={row.detailURL} class="portfolio-row-main">
			<div class="portfolio-row-avatar" aria-hidden="true">
				<span>{row.symbolInitial}</span>
			</div>
			<div class="min-w-0 flex-1">
				<p class="portfolio-row-symbol">
					{row.symbol}
					<SentimentBadge vm={row.sentiment} />
				</p>
				<p class="portfolio-row-subtitle">{row.subtitle}</p>
				<p class="portfolio-row-shares">{row.sharesLabel} · Cost {row.costBasis}</p>
				{#if row.targetAlertPrice !== ''}
					<p class="portfolio-row-alert">
						<Icon name="bell" class="h-3 w-3" />
						{row.targetAlertPrice}
					</p>
				{/if}
			</div>
		</a>
		<!-- Always rendered, even when empty. The grid tracks are shared
		     across rows, and a conditional cell here shifts every column
		     after it into the wrong track on rows that lack a sparkline. -->
		<div class="portfolio-row-spark overview-watchlist-spark">
			{#if spark}<EChart {...spark} />{/if}
		</div>
		<PositionQuote row={quote ?? row} />
		<div class="portfolio-row-menu" bind:this={menuRoot}>
			<NativeButton
				class="portfolio-row-menu-btn"
				bind:ref={menubtn}
				onclick={toggle}
				aria-label={'Actions for ' + row.symbol}
				aria-haspopup="menu"
				aria-expanded={open}
			>
				<Icon name="ellipsis" class="h-5 w-5" />
			</NativeButton>
			<div class="portfolio-row-menu-panel" hidden={!open} role="menu" style:top={pos.top} style:left={pos.left}>
				<NativeButton class="portfolio-row-menu-item" role="menuitem" onclick={() => act('/portfolio/positions/' + row.id + '/edit')}>
					Edit
				</NativeButton>
				<NativeButton class="portfolio-row-menu-item" role="menuitem" onclick={() => act('/portfolio/positions/' + row.id + '/sell')}>
					Sell
				</NativeButton>
				<NativeButton class="portfolio-row-menu-item" role="menuitem" onclick={() => act('/portfolio/positions/' + row.id + '/alert')}>
					{#if row.targetAlertID !== ''}
						Edit price alert
					{:else if isPro}
						Add price alert
					{:else}
						Price alert (Pro)
					{/if}
				</NativeButton>
			</div>
		</div>
	</div>
</div>
