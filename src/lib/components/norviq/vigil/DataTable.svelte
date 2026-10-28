<script lang="ts">
	// vigil.DataTable(class) { <thead>/<tbody> with plain th/td } — dense mono
	// table; geometry comes from the [&_th]/[&_td] descendant variants.
	import type { Snippet } from 'svelte';
	import Table from '../tui/table/Table.svelte';

	let { class: className = '', children }: { class?: string; children?: Snippet } = $props();
</script>

<div class={'vigil-data-table-wrap overflow-x-auto ' + className}>
	<Table
		class="vigil-data-table mcp-token-table border-collapse text-[0.78rem] [font-variant-numeric:tabular-nums] [&_th]:border-b [&_th]:border-border [&_th]:px-[0.35rem] [&_th]:py-[0.45rem] [&_th]:text-left [&_th]:align-top [&_th]:text-[0.62rem] [&_th]:font-semibold [&_th]:text-muted-foreground [&_td]:border-t [&_td]:border-border [&_td]:px-[0.35rem] [&_td]:py-[0.4rem] [&_td]:align-top"
	>
		{@render children?.()}
	</Table>
</div>
