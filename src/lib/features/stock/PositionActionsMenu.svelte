<script lang="ts">
	// stock.PositionActionsMenu + PositionActionModal. The menu items load the
	// portfolio feature's position panels (GET /portfolio/positions/{id}/edit|
	// sell|alert, owned by the portfolio port) into #position-action-dialog.
	import { goto } from '$app/navigation';
	import { NativeButton } from '#lib/components/norviq/index.js';
	import * as dialog from '#lib/components/norviq/tui/dialog/index.js';
	import PositionActionPanel from '#lib/features/portfolio/holdings/PositionActionPanel.svelte';
	import { positionAction } from '#lib/features/portfolio/holdings/client.js';
	import type { PositionActionResult } from '#lib/features/portfolio/holdings/types.js';

	let { symbol, positionID, isPro }: { symbol: string; positionID: string; isPro: boolean } =
		$props();

	let open = $state(false);
	let pos = $state({ top: '0px', left: '0px' });
	let btn = $state<HTMLButtonElement | null>(null);
	let root = $state<HTMLElement | null>(null);
	let panel = $state<Exclude<PositionActionResult, { redirect: string } | { panel: 'add' }> | null>(
		null
	);

	function toggle() {
		if (!open && btn) {
			const r = btn.getBoundingClientRect();
			pos = { top: r.bottom + 4 + 'px', left: Math.max(0, r.right - 160) + 'px' };
		}
		open = !open;
	}

	$effect(() => {
		if (!open) return;
		const onClick = (e: MouseEvent) => {
			if (root && !root.contains(e.target as Node)) open = false;
		};
		document.addEventListener('click', onClick, true);
		return () => document.removeEventListener('click', onClick, true);
	});

	async function apply(result: PositionActionResult | null) {
		if (!result) return;
		if ('redirect' in result) {
			dialog.closeDialog('position-action-dialog');
			await goto(result.redirect, { invalidateAll: true });
			return;
		}
		if (result.panel !== 'add') panel = result;
	}

	async function action(kind: 'edit' | 'sell' | 'alert') {
		open = false;
		dialog.openDialog('position-action-dialog');
		await apply(await positionAction(`/portfolio/positions/${positionID}/${kind}`));
	}
</script>

<div class="stock-detail-actions" bind:this={root}>
	<NativeButton
		class="stock-detail-actions-btn"
		bind:ref={btn}
		onclick={toggle}
		aria-label={'Actions for ' + symbol}
		aria-haspopup="menu"
		aria-expanded={open}
	>
		Manage position
	</NativeButton>
	<div
		class="portfolio-row-menu-panel stock-detail-actions-panel"
		hidden={!open}
		role="menu"
		style={'top:' + pos.top + ';left:' + pos.left}
	>
		<NativeButton class="portfolio-row-menu-item" role="menuitem" onclick={() => action('edit')}
			>Edit</NativeButton
		>
		<NativeButton class="portfolio-row-menu-item" role="menuitem" onclick={() => action('sell')}
			>Sell</NativeButton
		>
		<NativeButton class="portfolio-row-menu-item" role="menuitem" onclick={() => action('alert')}>
			Price alert
			{#if !isPro}<span class="stock-pro-badge">Pro</span>{/if}
		</NativeButton>
	</div>
</div>
<!-- PositionActionModal: Go placed it at the end of the page; a native
     <dialog> renders in the top layer, so only its DOM position differs. -->
<dialog.Dialog id="position-action-dialog">
	<dialog.Content class="glass-card vigil-modal-panel border-0 p-6 sm:max-w-2xl md:p-8">
		{#if panel}
			<PositionActionPanel
				result={panel}
				onsubmit={async (form, method, url) => apply(await positionAction(url, method, form))}
				onrequest={async (method, url) => apply(await positionAction(url, method))}
			/>
		{:else}
			<div id="position-action-panel"></div>
		{/if}
	</dialog.Content>
</dialog.Dialog>
