<script lang="ts">
	// templUI dialog.Header.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	let {
		class: className,
		children,
		...rest
	}: HTMLAttributes<HTMLDivElement> & { children?: Snippet } = $props();
</script>

<div class={cn('flex flex-col gap-2 text-center sm:text-left', className)} {...rest}>
	{@render children?.()}
</div>
