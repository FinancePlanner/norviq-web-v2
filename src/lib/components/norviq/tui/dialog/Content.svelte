<script lang="ts">
	// templUI dialog.Content: the native <dialog>, shown with showModal() (or
	// show() when disableModal), animated by the data-tui-dialog-open classes, and
	// closed 200ms after the state flips so the exit transition can play.
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';
	import { CLOSE_DURATION_MS, getDialogContext } from './dialog.svelte.js';

	type Props = HTMLDialogAttributes & { hideCloseButton?: boolean; disableModal?: boolean; children?: Snippet };

	let { class: className, hideCloseButton = false, disableModal = false, children, ...rest }: Props = $props();

	const ctx = getDialogContext();
	if (!ctx) throw new Error('dialog.Content must be inside dialog.Dialog');
	const dlg = ctx;

	let el = $state<HTMLDialogElement | null>(null);
	// What the element's data-tui-dialog-open reports; it lags `dlg.open` by
	// one forced reflow on open so the enter transition runs (Safari).
	let shown = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		const dialog = el;
		if (!dialog) return;
		if (dlg.open) {
			clearTimeout(timer);
			dlg.closing = false;
			if (!dialog.open) {
				try {
					if (disableModal) dialog.show();
					else dialog.showModal();
				} catch {
					return;
				}
			}
			void dialog.offsetWidth;
			shown = true;
		} else {
			shown = false;
			if (!dialog.open) return;
			dlg.closing = true;
			clearTimeout(timer);
			timer = setTimeout(() => {
				if (dialog.open) dialog.close();
				dlg.closing = false;
			}, CLOSE_DURATION_MS);
		}
	});

	$effect(() => () => clearTimeout(timer));

	function oncancel(event: Event) {
		event.preventDefault();
		if (dlg.disableESC) return;
		dlg.hide();
	}

	function onclose() {
		clearTimeout(timer);
		dlg.closing = false;
		shown = false;
		dlg.hide();
	}

	function onclick(event: MouseEvent) {
		if (event.target !== el || dlg.disableClickAway) return;
		dlg.hide();
	}
</script>

<dialog
	bind:this={el}
	class={cn(
		'fixed left-[50%] top-[50%] z-50 m-0 flex w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden border bg-background p-6 text-foreground shadow-lg outline-none sm:max-w-lg',
		'[&:not([open]):not([data-tui-dialog-closing=true])]:hidden',
		'rounded-lg',
		'[&::backdrop]:transition-all [&::backdrop]:duration-200',
		'data-[tui-dialog-open=false]:[&::backdrop]:bg-black/0',
		'data-[tui-dialog-open=true]:[&::backdrop]:bg-black/50',
		'transition-all duration-200',
		'data-[tui-dialog-open=false]:scale-95',
		'data-[tui-dialog-open=true]:scale-100',
		'data-[tui-dialog-open=false]:opacity-0',
		'data-[tui-dialog-open=true]:opacity-100',
		className
	)}
	data-tui-dialog-content
	data-tui-dialog-open={shown ? 'true' : 'false'}
	data-tui-dialog-closing={dlg.closing ? 'true' : undefined}
	data-tui-dialog-show-modal={disableModal ? 'false' : 'true'}
	{oncancel}
	{onclose}
	{onclick}
	{...rest}
>
	{@render children?.()}
	{#if !hideCloseButton}
		<button
			class={cn(
				'absolute top-4 right-4',
				'rounded-xs opacity-70',
				'transition-opacity hover:opacity-100',
				'focus:outline-none focus:ring-2',
				'focus:ring-ring focus:ring-offset-2',
				'ring-offset-background',
				'data-[tui-dialog-open=true]:bg-accent',
				'data-[tui-dialog-open=true]:text-muted-foreground',
				'disabled:pointer-events-none',
				'[&_svg]:pointer-events-none',
				'[&_svg]:shrink-0',
				"[&_svg:not([class*='size-'])]:size-4"
			)}
			data-tui-dialog-close
			aria-label="Close"
			type="button"
			onclick={() => dlg.hide()}
		>
			<X />
			<span class="sr-only">Close</span>
		</button>
	{/if}
</dialog>
