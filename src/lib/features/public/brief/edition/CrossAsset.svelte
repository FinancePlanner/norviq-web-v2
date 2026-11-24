<script lang="ts">
	// G. Cross-asset context: rates in basis points, commodities, Asia.
	import type { CrossAssetRowVM } from './types.js';

	let {
		title,
		sections,
		columns
	}: {
		title: string;
		sections: { title: string; rows: CrossAssetRowVM[] }[];
		columns: { name: string; level: string; change: string };
	} = $props();
</script>

<section aria-labelledby="mi-cross-title">
	<h2 id="mi-cross-title" class="mi-section-title">{title}</h2>
	{#each sections as section (section.title)}
		<div class="mi-asset-section">
			<h3 class="mi-label">{section.title}</h3>
			<table class="mi-table">
				<thead class="sr-only">
					<tr>
						<th scope="col">{columns.name}</th>
						<th scope="col">{columns.level}</th>
						<th scope="col">{columns.change}</th>
					</tr>
				</thead>
				<tbody>
					{#each section.rows as row (row.symbol)}
						<tr>
							<th scope="row" class="font-normal">{row.name}</th>
							<td>{row.level}</td>
							<td class="mi-move mi-{row.direction}">{row.change}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/each}
</section>
