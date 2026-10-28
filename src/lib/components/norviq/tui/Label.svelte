<script lang="ts">
	// templUI internal/components/label (also form.Label).
	import type { Snippet } from 'svelte';
	import type { HTMLLabelAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	let {
		class: className,
		for: htmlFor,
		error = '',
		children,
		...rest
	}: HTMLLabelAttributes & { error?: string; children?: Snippet } = $props();
</script>

<label
	for={htmlFor || undefined}
	class={cn('text-sm font-medium leading-none inline-block', error && 'text-destructive', className)}
	data-tui-label-disabled-style="opacity-50 cursor-not-allowed"
	{...rest}>{@render children?.()}</label
>
