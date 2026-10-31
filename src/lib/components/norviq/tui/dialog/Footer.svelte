<script lang="ts">
	// templUI dialog.Footer.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	let {
		class: className,
		children,
		...rest
	}: HTMLAttributes<HTMLDivElement> & { children?: Snippet } = $props();
</script>

<div class={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...rest}>
	{@render children?.()}
</div>
