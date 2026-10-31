<script lang="ts">
	// templUI table.Caption.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	let {
		class: className,
		children,
		...rest
	}: HTMLAttributes<HTMLElement> & { children?: Snippet } = $props();
</script>

<caption class={cn('mt-4 text-sm text-muted-foreground', className)} {...rest}
	>{@render children?.()}</caption
>
