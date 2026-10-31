<!--
	YoY growth sparkline (port of charts.GrowthSparklineSVG). Pure SVG, SSRs.
	tone="negative" draws the loss colour; anything else the gain colour. Fewer than two
	points renders nothing.
-->
<script lang="ts">
	import { growthSparklineGeometry, type GrowthSparklinePoint } from './growth-sparkline.js';

	let { points, tone = 'positive' }: { points: readonly GrowthSparklinePoint[]; tone?: string } =
		$props();

	const g = $derived(growthSparklineGeometry(points, tone));
</script>

{#if g}
	<svg class="fin-growth-sparkline-svg" viewBox={g.viewBox} role="img" aria-hidden="true">
		<defs>
			<linearGradient id={g.fillID} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" style:stop-color={g.stroke} stop-opacity="0.35" />
				<stop offset="100%" style:stop-color={g.stroke} stop-opacity="0" />
			</linearGradient>
		</defs>
		{#if g.zeroLine}
			<line
				class="fin-growth-sparkline-zero"
				x1={g.zeroLine.x1}
				y1={g.zeroLine.y1}
				x2={g.zeroLine.x2}
				y2={g.zeroLine.y2}
			/>
		{/if}
		<path class="fin-growth-sparkline-area" fill="url(#{g.fillID})" d={g.areaPath} />
		<polyline
			class="fin-growth-sparkline-line"
			fill="none"
			style:stroke={g.stroke}
			stroke-width="1.75"
			stroke-linejoin="round"
			stroke-linecap="round"
			points={g.points}
		/>
	</svg>
{/if}
