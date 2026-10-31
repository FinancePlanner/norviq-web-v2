<script lang="ts">
	// templUI dialog.Title.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	let {
		class: className,
		children,
		...rest
	}: HTMLAttributes<HTMLHeadingElement> & { children?: Snippet } = $props();
</script>

<h2 class={cn('text-lg leading-none font-semibold', className)} {...rest}>
	{@render children?.()}
</h2>
