<script lang="ts">
	// dashboard.InsightCardsGrid(cards) + InsightCard.
	import type { InsightCardVM } from '../types.js';
	import InsightIcon from './InsightIcon.svelte';

	let { cards }: { cards: InsightCardVM[] | null | undefined } = $props();
</script>

{#if cards && cards.length > 0}
	<div class="insight-cards-grid">
		{#each cards as card, i (i)}
			<div class="dash-panel insight-card card-hover">
				<div class="insight-card-head">
					<span class={'dash-kpi-icon dash-kpi-icon-' + card.tone} aria-hidden="true">
						<InsightIcon kind={card.iconKind} />
					</span>
					<p class="insight-card-title">{card.title}</p>
				</div>
				<p class="insight-card-value">{card.value}</p>
				<p class="insight-card-detail">{card.detail}</p>
			</div>
		{/each}
	</div>
{/if}
