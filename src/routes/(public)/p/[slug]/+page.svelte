<script lang="ts">
	// pages/public/portfolio_share.templ (PortfolioShareMetaTags + PortfolioSharePage).
	import DonutSVG from '#lib/charts/DonutSVG.svelte';
	import { donutGeometry } from '#lib/charts/donut-svg.js';
	import PublicNav from '#lib/features/public/stock/PublicNav.svelte';
	import PublicMetaTags from '#lib/features/public/stock/PublicMetaTags.svelte';

	let { data } = $props();
	const vm = $derived(data.vm);
	const hasPie = $derived(donutGeometry(vm.slices) !== null);

	// toneClass: a missing value ("—") stays neutral.
	function toneClass(value: string, up: boolean): string {
		if (value === '—') return '';
		return up ? 'text-success' : 'text-danger';
	}
</script>

<svelte:head>
	<title>{vm.title}</title>
	<PublicMetaTags
		title={vm.title}
		description={vm.metaDescription}
		canonicalURL={vm.canonicalURL}
		ogImageURL={vm.ogImageURL}
		robots="noindex,nofollow"
	/>
</svelte:head>

{#snippet shareStat(label: string, value: string, up: boolean)}
	<div>
		<dt class="text-xs text-muted-foreground">{label}</dt>
		<dd class={['text-lg font-semibold tabular-nums', toneClass(value, up)]}>{value}</dd>
	</div>
{/snippet}

{#snippet shareSwatch(color: string)}
	<svg
		data-share-swatch
		class="mr-2 inline-block align-middle"
		width="10"
		height="10"
		viewBox="0 0 10 10"
		aria-hidden="true"><rect width="10" height="10" rx="2" fill={color}></rect></svg
	>
{/snippet}

<main id="main-content" class="public-portfolio-share mx-auto w-full max-w-xl px-6 py-10">
	<PublicNav />
	<section class="mt-8 rounded-[var(--radius)] border bg-card-bg p-6">
		<h1 class="text-xl font-semibold">A portfolio on Norviq</h1>
		<p class="text-sm text-muted-foreground">As of {vm.asOf}</p>
		<dl class="mt-4 grid grid-cols-3 gap-3 text-center">
			{@render shareStat('Total return', vm.totalPnl, vm.totalPnlUp)}
			{@render shareStat('Today', vm.totalDay, vm.totalDayUp)}
			{@render shareStat('YTD', vm.ytd, vm.ytdUp)}
		</dl>
		{#if vm.rows.length === 0}
			<p class="mt-6 text-center text-muted-foreground">No holdings yet</p>
		{:else}
			{#if hasPie}
				<div class="mx-auto mt-6 w-48" data-share-pie>
					<DonutSVG slices={vm.slices} />
				</div>
			{/if}
			<table class="mt-6 w-full text-sm tabular-nums">
				<thead class="text-muted-foreground">
					<tr>
						<th scope="col" class="py-2 text-left font-medium">Symbol</th>
						<th scope="col" class="py-2 text-right font-medium">Weight</th>
						<th scope="col" class="py-2 text-right font-medium">Return</th>
						<th scope="col" class="py-2 text-right font-medium">Today</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.rows as row, i (i)}
						<tr class="border-t">
							<td class="py-1.5 font-medium">
								{@render shareSwatch(row.color)}
								{row.symbol}
							</td>
							<td class="py-1.5 text-right">{row.weight}</td>
							<td class={['py-1.5 text-right', toneClass(row.pnl, row.pnlPositive)]}>{row.pnl}</td>
							<td class={['py-1.5 text-right', toneClass(row.day, row.dayPositive)]}>{row.day}</td>
						</tr>
					{/each}
					{#if vm.other}
						<tr class="border-t text-muted-foreground">
							<td class="py-1.5">
								{@render shareSwatch(vm.otherColor)}
								Other
							</td>
							<td class="py-1.5 text-right">{vm.other}</td>
							<td></td>
							<td></td>
						</tr>
					{/if}
				</tbody>
			</table>
		{/if}
	</section>
	<a
		href="/signup"
		class="mt-6 block rounded-[var(--radius-control)] bg-tint px-4 py-3 text-center font-medium text-white"
		>Build yours on Norviq</a
	>
</main>
