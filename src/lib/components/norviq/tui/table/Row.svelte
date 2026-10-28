<script lang="ts">
	// templUI table.Row.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	let {
		class: className,
		selected = false,
		children,
		...rest
	}: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean; children?: Snippet } = $props();
</script>

<tr
	class={cn(
		'border-b transition-colors hover:bg-muted/50',
		selected && 'data-[tui-table-state-selected]:bg-muted',
		className
	)}
	data-tui-table-state-selected={selected ? '' : undefined}
	{...rest}>{@render children?.()}</tr
>
