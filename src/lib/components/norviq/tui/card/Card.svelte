<script lang="ts">
	// templUI card.Card.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	let {
		class: className,
		children,
		...rest
	}: HTMLAttributes<HTMLDivElement> & { children?: Snippet } = $props();
</script>

<div
	class={cn('w-full rounded-lg border bg-card text-card-foreground shadow-xs', className)}
	{...rest}
>
	{@render children?.()}
</div>
