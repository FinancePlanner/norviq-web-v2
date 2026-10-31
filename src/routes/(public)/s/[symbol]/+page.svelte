<script lang="ts">
	// pages/public/stock.templ (MetaTags + Page). No i18n: the Go templ is
	// English-only, and one render is served to every visitor.
	import TechnicalsStrip from '#lib/components/norviq/TechnicalsStrip.svelte';
	import InsiderActivity from '#lib/components/norviq/InsiderActivity.svelte';
	import InstitutionalOwnership from '#lib/components/norviq/InstitutionalOwnership.svelte';
	import CongressTrades from '#lib/components/norviq/CongressTrades.svelte';
	import GrowthSparkline from '#lib/charts/GrowthSparkline.svelte';
	import PublicNav from '#lib/features/public/stock/PublicNav.svelte';
	import PublicMetaTags from '#lib/features/public/stock/PublicMetaTags.svelte';

	let { data } = $props();
	const vm = $derived(data.vm);

	// headerMeta: exchange and currency, whichever is present.
	const headerMeta = $derived([vm.exchange, vm.currency].filter(Boolean).join(' • '));
	const postCountLabel = (count: number) => (count === 1 ? 'from 1 post' : `from ${count} posts`);
</script>

<svelte:head>
	<title>{vm.title}</title>
	<PublicMetaTags
		title={vm.title}
		description={vm.metaDescription}
		canonicalURL={vm.canonicalURL}
		ogImageURL={vm.ogImageURL}
		robots="index,follow,max-image-preview:large"
	/>
</svelte:head>

{#snippet gate()}
	<p class="public-stock-gate mt-6">
		<a
			href={vm.gateHref}
			class="text-sm font-semibold underline underline-offset-4"
			data-public-gate>See the full analysis in Norviq →</a
		>
	</p>
{/snippet}

<main id="main-content" class="public-stock-page mx-auto w-full max-w-3xl px-6 py-10">
	<PublicNav />

	<section class="public-stock-section" data-public-section="header">
		<p class="text-sm font-semibold tracking-widest text-muted-foreground">{vm.symbol}</p>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight">{vm.companyName}</h1>
		<div class="mt-4 flex flex-wrap items-baseline gap-3">
			{#if vm.price}
				<span class="text-2xl font-semibold tabular-nums">{vm.price}</span>
			{/if}
			{#if vm.changePct}
				<span class={['text-base font-medium tabular-nums', vm.changeTone]}>{vm.changePct}</span>
			{/if}
		</div>
		{#if vm.exchange || vm.currency}
			<p class="mt-2 text-sm text-muted-foreground">{headerMeta}</p>
		{/if}
		{@render gate()}
	</section>

	{#if vm.technicals.present}
		<section class="public-stock-section mt-6" data-public-section="technicals">
			<TechnicalsStrip vm={vm.technicals} />
		</section>
	{/if}

	{#if vm.sparkline}
		<section class="public-stock-section mt-10" data-public-section="price-trend">
			<h2 class="text-xl font-semibold">Price trend</h2>
			{#if vm.rangeLabel}
				<p class="mt-1 text-sm text-muted-foreground">{vm.rangeLabel}</p>
			{/if}
			<div class="fin-growth-sparkline mt-4">
				<GrowthSparkline points={vm.sparkline.points} tone={vm.sparkline.tone} />
			</div>
			{@render gate()}
		</section>
	{/if}

	{#if vm.sentiment.present}
		<section class="public-stock-section mt-10" data-public-section="sentiment">
			<h2 class="text-xl font-semibold">Social sentiment</h2>
			<p class="mt-3 flex flex-wrap items-center gap-3">
				<span class="rounded-full border px-3 py-1 text-sm font-medium">{vm.sentiment.label}</span>
				{#if vm.sentiment.score}
					<span class="text-sm text-muted-foreground tabular-nums">{vm.sentiment.score}</span>
				{/if}
				<span class="text-sm text-muted-foreground">{postCountLabel(vm.sentiment.postCount)}</span>
			</p>
			{@render gate()}
		</section>
	{/if}

	{#if vm.earnings.nextDate || vm.earnings.quarters.length > 0}
		<section class="public-stock-section mt-10" data-public-section="earnings">
			<h2 class="text-xl font-semibold">Earnings</h2>
			{#if vm.earnings.nextDate}
				<p class="mt-1 text-sm text-muted-foreground">Next report {vm.earnings.nextDate}</p>
			{/if}
			{#if vm.earnings.streakHeadline}
				<p class={['mt-2 text-sm font-semibold', vm.earnings.streakTone]} data-earnings-streak>
					{vm.earnings.streakHeadline}
				</p>
			{/if}
			{#if vm.earnings.quarters.length > 0}
				<table class="mt-4 w-full text-left text-sm">
					<thead class="text-muted-foreground">
						<tr>
							<th scope="col" class="py-2 font-medium">Quarter</th>
							<th scope="col" class="py-2 text-right font-medium">Estimate</th>
							<th scope="col" class="py-2 text-right font-medium">Actual</th>
							<th scope="col" class="py-2 text-right font-medium">Result</th>
						</tr>
					</thead>
					<tbody>
						{#each vm.earnings.quarters as quarter, i (i)}
							<tr class="border-t">
								<td class="py-2">{quarter.date}</td>
								<td class="py-2 text-right tabular-nums">{quarter.estimate}</td>
								<td class="py-2 text-right tabular-nums">{quarter.actual}</td>
								<td class={['py-2 text-right font-medium', quarter.tone]}>{quarter.verdict}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
			{@render gate()}
		</section>
	{/if}

	{#if vm.insider.present}
		<section class="public-stock-section mt-10" data-public-section="insider">
			<h2 class="text-xl font-semibold">Insider activity</h2>
			<div class="mt-3">
				<InsiderActivity vm={vm.insider} />
			</div>
			{@render gate()}
		</section>
	{/if}

	{#if vm.institutional.present}
		<section class="public-stock-section mt-10" data-public-section="institutional">
			<h2 class="text-xl font-semibold">Institutional ownership</h2>
			<div class="mt-3">
				<InstitutionalOwnership vm={vm.institutional} />
			</div>
			{@render gate()}
		</section>
	{/if}

	{#if vm.congress.present}
		<section class="public-stock-section mt-10" data-public-section="congress">
			<h2 class="text-xl font-semibold">Congressional trades</h2>
			<div class="mt-3">
				<CongressTrades vm={vm.congress} />
			</div>
			{@render gate()}
		</section>
	{/if}

	<footer class="mt-14 border-t pt-6 text-sm text-muted-foreground">
		<p>
			Market data for {vm.symbol} is provided for information only and is not investment advice.
		</p>
	</footer>
</main>
