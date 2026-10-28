<script lang="ts">
	// templUI dialog.Trigger: a display:contents span that toggles its dialog —
	// the enclosing one, or the dialog whose id is `for`.
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
	const dialog = $derived(resolveDialog(target, ctx));
</script>

<span
	data-tui-dialog-trigger
	data-tui-dialog-target={target || undefined}
	data-tui-dialog-trigger-open={dialog?.open ? 'true' : 'false'}
	class={cn('contents', className)}
	onclick={() => dialog?.toggle()}
	role="presentation"
	{...rest}>{@render children?.()}</span
>
