<script lang="ts">
	// dashboard.WhyMovedShell / WhyMovedStrip. `vm` undefined = shell; null =
	// nothing to show (Go's empty 200 collapsed the shell).
	import SkeletonBlock from '#lib/components/norviq/SkeletonBlock.svelte';
	import type { WhyMovedVM } from './types.js';

	let { vm }: { vm?: WhyMovedVM | null } = $props();

	function sentimentClass(label: string): string {
		if (label === 'bullish' || label === 'positive') return 'why-moved-sentiment-bullish';
		if (label === 'bearish' || label === 'negative') return 'why-moved-sentiment-bearish';
		return 'why-moved-sentiment-neutral';
	}
</script>

{#if vm === undefined}
	<div id="why-moved-strip">
		<div class="why-moved-strip" aria-hidden="true">
			<SkeletonBlock heightClass="h-16 rounded-lg" />
		</div>
	</div>
{:else if vm}
	<section class="why-moved-strip glass-card w-full p-4 md:p-5" aria-labelledby="why-moved-title">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 id="why-moved-title" class="why-moved-title">
				Agentic intelligence feed
				{#if vm.changeLabel}
					<span class="why-moved-change">{vm.changeLabel}</span>
				{/if}
			</h2>
			{#if vm.sourceLine}
				<span class="why-moved-source">{vm.sourceLine}</span>
			{:else}
				<span class="why-moved-source">Why it moved · Hermes signals</span>
			{/if}
		</div>
		{#if vm.aiSummary}
			<p class="why-moved-summary">
				<span class="why-moved-spark" aria-hidden="true">✦</span>
				{vm.aiSummary}
			</p>
		{/if}
		{#if vm.capacityLine}
			<p class="why-moved-source">{vm.capacityLine}</p>
		{/if}
		{#if vm.moverChips.length > 0}
			<div class="why-moved-chips why-moved-chips-timeline">
				{#each vm.moverChips as chip, i (i)}
					<a class="why-moved-chip row-hover" href={'/portfolio/' + chip.symbol}>
						<span class="tabular-nums font-bold">{chip.symbol}</span>
						<span class={['tabular-nums font-semibold', chip.changePct >= 0 && 'text-success', chip.changePct < 0 && 'text-danger']}>{chip.change}</span>
						{#if chip.sentimentLabel}
							<span class={['why-moved-sentiment', sentimentClass(chip.sentimentLabel)]}>{chip.sentimentLabel} · {chip.postCount}</span>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
		{#if vm.indexChips.length > 0}
			<div class="why-moved-context">
				{#each vm.indexChips as index, i (i)}
					<span class="why-moved-index">
						{index.label}
						<span class={['tabular-nums', index.changePct >= 0 && 'text-success', index.changePct < 0 && 'text-danger']}>{index.change}</span>
					</span>
				{/each}
				{#if !vm.isPro && vm.moverChips.length > 0}
					<a href="/settings/subscription" class="why-moved-teaser">See the posts behind the sentiment →</a>
				{/if}
			</div>
		{/if}
	</section>
{/if}
