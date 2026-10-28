<script lang="ts">
	// templUI dialog.Close: a display:contents span that closes the enclosing
	// dialog, or the one whose id is `for`.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';
	import { getDialogContext, resolveDialog } from './dialog.svelte.js';

	let {
		for: target,
		class: className,
		children,
		...rest
	}: HTMLAttributes<HTMLSpanElement> & { for?: string; children?: Snippet } = $props();

	const ctx = getDialogContext();
</script>

<span
	data-tui-dialog-close
	data-tui-dialog-target={target || undefined}
	class={cn('contents cursor-pointer', className)}
	onclick={() => resolveDialog(target, ctx)?.hide()}
	role="presentation"
	{...rest}>{@render children?.()}</span
>
