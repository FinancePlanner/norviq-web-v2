<script lang="ts">
	// templUI table.Table.
	import type { Snippet } from 'svelte';
	import type { HTMLTableAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	let { class: className, children, ...rest }: HTMLTableAttributes & { children?: Snippet } = $props();
</script>

<table class={cn('w-full caption-bottom text-sm', className)} {...rest}>{@render children?.()}</table>
