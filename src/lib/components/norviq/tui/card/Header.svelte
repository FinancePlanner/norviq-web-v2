<script lang="ts">
	// templUI card.Header.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	let {
		class: className,
		children,
		...rest
	}: HTMLAttributes<HTMLDivElement> & { children?: Snippet } = $props();
</script>

<div class={cn('flex flex-col space-y-1.5 p-6 pb-0', className)} {...rest}>
	{@render children?.()}
</div>
