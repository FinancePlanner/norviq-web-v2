<script lang="ts">
	// E. Comparative intraday performance: server-drawn SVG plus a data table.
	import { CHART_H, CHART_W, PAD } from './chart.js';
	import type { IntradayChartVM } from './types.js';

	let { title, chart, tableLabel }: { title: string; chart: IntradayChartVM; tableLabel: string } =
		$props();
</script>

<section class="mi-chart" aria-labelledby="mi-chart-title">
	<h2 id="mi-chart-title" class="mi-section-title">{title}</h2>
	<ul class="mi-legend" role="list">
		{#each chart.series as s (s.symbol)}
			<li class="mi-tone-{s.tone}">
				<span class="mi-legend__swatch" aria-hidden="true"></span><span class="mi-legend__name"
					>{s.name}</span
				><span class="mi-legend__value mi-{s.direction}">{s.last}</span>
			</li>
		{/each}
	</ul>
	<svg
		viewBox="0 0 {CHART_W} {CHART_H}"
		role="img"
		aria-labelledby="mi-chart-svg-title mi-chart-svg-desc"
	>
		<title id="mi-chart-svg-title">{chart.title}</title>
		<desc id="mi-chart-svg-desc">{chart.description}</desc>
		{#each chart.yTicks as tick (tick.y)}
			<line class="grid" x1={PAD.left} x2={CHART_W - PAD.right} y1={tick.y} y2={tick.y} />
			<text class="tick" x={PAD.left - 8} y={tick.y + 4} text-anchor="end">{tick.label}</text>
		{/each}
		{#if chart.zero !== null}
			<line class="zero" x1={PAD.left} x2={CHART_W - PAD.right} y1={chart.zero} y2={chart.zero} />
		{/if}
		{#each chart.xTicks as tick (tick.x)}
			<text class="tick" x={tick.x} y={CHART_H - 8} text-anchor="middle">{tick.label}</text>
		{/each}
		{#each chart.series as s (s.symbol)}
			<path class="series mi-tone-{s.tone}" d={s.path} />
		{/each}
	</svg>
	<p class="mi-chart__note">{chart.title}</p>
	<details class="mi-details">
		<summary>{tableLabel}</summary>
		<div class="mi-scroll">
			<table class="mi-table">
				<caption class="sr-only">{chart.description}</caption>
				<thead>
					<tr>
						{#each chart.table.columns as col, i (i)}
							<th scope="col">{col}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each chart.table.rows as row, r (r)}
						<tr>
							{#each row as cell, i (i)}
								{#if i === 0}
									<th scope="row">{cell}</th>
								{:else}
									<td>{cell}</td>
								{/if}
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>
</section>
