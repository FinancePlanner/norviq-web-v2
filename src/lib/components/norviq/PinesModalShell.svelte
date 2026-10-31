<script lang="ts">
	// components.PinesModalShell(modalID, openEvent, title) { children } — the
	// Alpine/Pines modal. `open` is bindable; when `openEvent` is set, a window
	// CustomEvent of that name opens it (Alpine `$dispatch('openQuickExpense')`
	// → `window.dispatchEvent(new CustomEvent('openQuickExpense'))`), and for
	// openQuickExpense, `closeQuickExpense` closes it. Escape closes.
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';
	import NativeButton from './NativeButton.svelte';

	let {
		modalID,
		openEvent = '',
		title,
		open = $bindable(false),
		children
	}: {
		modalID: string;
		openEvent?: string;
		title: string;
		open?: boolean;
		children?: Snippet;
	} = $props();

	$effect(() => {
		if (!openEvent) return;
		const onOpen = () => (open = true);
		const onClose = () => (open = false);
		window.addEventListener(openEvent, onOpen);
		if (openEvent === 'openQuickExpense') window.addEventListener('closeQuickExpense', onClose);
		return () => {
			window.removeEventListener(openEvent, onOpen);
			window.removeEventListener('closeQuickExpense', onClose);
		};
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') open = false;
	}}
/>

<div id={modalID} class="pines-modal" style:display={open ? undefined : 'none'}>
	<div class="pines-modal-backdrop" onclick={() => (open = false)} aria-hidden="true"></div>
	<!-- svelte-ignore a11y_click_events_have_key_events -- stopPropagation only (Alpine @click.stop) -->
	<div
		class="pines-modal-panel glass-card p-0"
		role="dialog"
		aria-modal="true"
		aria-labelledby={modalID + '-title'}
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="pines-modal-header">
			<h2 id={modalID + '-title'} class="pines-modal-title">{title}</h2>
			<NativeButton class="pines-modal-close" aria-label="Close" onclick={() => (open = false)}>
				<X class="h-5 w-5" data-lucide="icon" />
			</NativeButton>
		</div>
		<div class="pines-modal-body">
			{@render children?.()}
		</div>
	</div>
</div>
