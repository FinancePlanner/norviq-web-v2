<script lang="ts">
	// dashboard.InsightKPIStrip(cards) + InsightKPICell.
	import type { InsightCardVM } from '../types.js';
	import InsightIcon from './InsightIcon.svelte';

	let { cards }: { cards: InsightCardVM[] | null | undefined } = $props();
</script>

<div class="dash-kpi-strip" role="list">
	{#each cards ?? [] as card, i (i)}
		<div class="dash-kpi-cell card-hover" role="listitem">
			<div class="dash-kpi-cell-head">
				<span class={'dash-kpi-icon dash-kpi-icon-' + card.tone} aria-hidden="true">
					<InsightIcon kind={card.iconKind} />
				</span>
				<p class="dash-kpi-label">{card.title}</p>
			</div>
			<p class="dash-kpi-value" data-format="$">{card.value}</p>
			<p class="dash-kpi-detail">{card.detail}</p>
		</div>
	{/each}
</div>
