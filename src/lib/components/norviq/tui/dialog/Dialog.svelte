<script lang="ts">
	// templUI dialog.Dialog: the `display: contents` root that owns the open dlg.
	// `open` is bindable; with an `id`, openDialog(id)/closeDialog(id) and
	// <Trigger for={id}> work from anywhere on the page.
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';
	import { DialogState, registerDialog, setDialogContext } from './dialog.svelte.js';

	type Props = HTMLAttributes<HTMLDivElement> & {
		open?: boolean;
		disableClickAway?: boolean;
		disableESC?: boolean;
		children?: Snippet;
	};

	let {
		id,
		open = $bindable(false),
		disableClickAway = false,
		disableESC = false,
		class: className,
		children,
		...rest
	}: Props = $props();

	const dlg = new DialogState(
		untrack(() => open),
		(v) => (open = v)
	);
	setDialogContext(dlg);

	$effect.pre(() => {
		dlg.disableClickAway = disableClickAway;
		dlg.disableESC = disableESC;
	});
	// Parent → state (bind:open / prop changes).
	$effect.pre(() => {
		const want = open;
		untrack(() => (want ? dlg.show() : dlg.hide()));
	});
	$effect(() => registerDialog(id ?? undefined, dlg));
</script>

<div
	{id}
	data-tui-dialog
	data-tui-dialog-disable-click-away={disableClickAway ? 'true' : undefined}
	data-tui-dialog-disable-esc={disableESC ? 'true' : undefined}
	data-tui-dialog-open={dlg.open ? 'true' : 'false'}
	data-tui-dialog-closing={dlg.closing ? 'true' : undefined}
	class={cn('contents', className)}
	{...rest}
>
	{@render children?.()}
</div>
