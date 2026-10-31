<script lang="ts">
	// templUI dialog.Description.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	let {
		class: className,
		children,
		...rest
	}: HTMLAttributes<HTMLParagraphElement> & { children?: Snippet } = $props();
</script>

<p class={cn('text-sm text-muted-foreground', className)} {...rest}>{@render children?.()}</p>
