<script lang="ts">
	// templUI form.ItemFlex.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	let { class: className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children?: Snippet } = $props();
</script>

<div class={cn('items-center flex space-x-2', className)} {...rest}>{@render children?.()}</div>
