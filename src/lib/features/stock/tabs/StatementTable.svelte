<script lang="ts">
	// stock.StatementTable
	import type { StatementRowVM } from '../types.js';

	let { rows }: { rows: StatementRowVM[] } = $props();
</script>

<dl class="stock-statement-table mt-4">
	{#each rows as row, i (i)}
		<div class="stock-statement-row">
			<dt>{row.label}</dt>
			<dd class="spring-pop" data-motion="spring">{row.value}</dd>
		</div>
	{/each}
</dl>
