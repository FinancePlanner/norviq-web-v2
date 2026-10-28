<!--
	Static, script-free allocation donut (port of charts.DonutSVG). SSRs, so it
	works on cached/public pages. Renders nothing when no slice has weight.
-->
<script lang="ts">
	import { donutGeometry, type DonutSlice } from './donut-svg.js';

	let { slices }: { slices: readonly DonutSlice[] | null | undefined } = $props();

	const geometry = $derived(donutGeometry(slices));
</script>

{#if geometry}
	<svg class="donut-chart" viewBox="0 0 42 42" role="img" aria-label={geometry.ariaLabel}>
		{#each geometry.circles as c, i (i)}
			<circle
				class="donut-slice"
				cx="21"
				cy="21"
				r={geometry.radius}
				fill="none"
				stroke={c.color}
				stroke-width="6"
				stroke-dasharray={c.dasharray}
				stroke-dashoffset={c.dashoffset}
				transform="rotate(-90 21 21)"><title>{c.title}</title></circle
			>
		{/each}
	</svg>
{/if}
