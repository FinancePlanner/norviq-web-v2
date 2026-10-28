<script lang="ts">
	// templUI form.Message. variant "error" → text-red-500, "info" → text-blue-500.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	let {
		class: className,
		variant,
		children,
		...rest
	}: HTMLAttributes<HTMLParagraphElement> & { variant?: 'error' | 'info'; children?: Snippet } = $props();
</script>

<p
	class={cn(
		'text-[0.8rem] font-medium',
		variant === 'error' ? 'text-red-500' : variant === 'info' ? 'text-blue-500' : '',
		className
	)}
	{...rest}
>
	{@render children?.()}
</p>
