<script lang="ts">
	// stock.EarningsTab + EarningsEventRow
	import { EmptyState, NativeButton, SectionCard } from '#lib/components/norviq/index.js';
	import { VisualizerCard } from '#lib/features/portfolio/earningsviz/index.js';
	import { staggerOnMount } from '#lib/motion.js';
	import { openTranscript } from '../panels.svelte.js';
	import type { DetailViewModel } from '../detail.js';

	let { vm }: { vm: DetailViewModel } = $props();
	const earnings = $derived(vm.earnings);
</script>

<div class="mt-6">
	{#if vm.earningsVisualizer}<VisualizerCard vm={vm.earningsVisualizer} />{/if}
	<SectionCard title="Earnings history">
		{#if earnings.streakHeadline !== ''}
			<p
				class={['stock-earnings-streak mt-2 text-sm font-semibold', earnings.streakTone]}
				data-earnings-streak
			>
				{earnings.streakHeadline}
			</p>
		{/if}
		{#if earnings.hasData}
			<div class="stock-earnings-list mt-4 space-y-3" {@attach staggerOnMount(':scope > div', 35)}>
				{#each earnings.events as event, i (i)}
					<div class="stock-earnings-row glass-card p-4 md:p-5">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="stock-earnings-date">{event.date}</p>
								<dl class="stock-earnings-metrics mt-3 grid gap-2 sm:grid-cols-2">
									<div>
										<dt class="text-xs text-muted-foreground">EPS actual / est.</dt>
										<dd class="spring-pop font-semibold" data-motion="spring">
											{event.epsActual} / {event.epsEstimated}
										</dd>
									</div>
									<div>
										<dt class="text-xs text-muted-foreground">Revenue actual / est.</dt>
										<dd class="spring-pop font-semibold" data-motion="spring">
											{event.revenueActual} / {event.revenueEstimated}
										</dd>
									</div>
									{#if event.surprise !== ''}
										<div>
											<dt class="text-xs text-muted-foreground">Surprise</dt>
											<dd class="font-semibold">{event.surprise}</dd>
										</div>
									{/if}
									<div>
										<dt class="text-xs text-muted-foreground">Result</dt>
										<dd class={['font-semibold', event.verdictTone]}>{event.verdict}</dd>
									</div>
								</dl>
							</div>
							{#if event.hasTranscript}
								<NativeButton
									class="stock-transcript-btn"
									onclick={() => openTranscript(vm.symbol, event.dateISO)}
									>View transcript</NativeButton
								>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<EmptyState
				title="No earnings on file"
				description="Past quarters and transcript links will appear here."
			/>
		{/if}
	</SectionCard>
</div>
