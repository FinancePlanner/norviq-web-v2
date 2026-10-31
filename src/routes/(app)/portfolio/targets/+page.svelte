<script lang="ts">
	// pages/portfolio/targets.templ TargetsPage
	import { enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { NativeButton } from '#lib/components/norviq/index.js';
	import TargetFormModal from '#lib/features/portfolio/workspace/TargetFormModal.svelte';
	import {
		emptyTargetForm,
		type TargetFormVM,
		type TargetRowVM
	} from '#lib/features/portfolio/workspace/targets.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// #target-action-panel: the open add/edit form, if any.
	let modal = $state<TargetFormVM | null>(null);
	$effect(() => {
		if (form && 'targetForm' in form && form.targetForm) modal = form.targetForm;
	});

	const openAdd = () => (modal = emptyTargetForm({ scenario: 'Base' }));
	const openEdit = (t: TargetRowVM) =>
		(modal = emptyTargetForm({
			id: t.id,
			isEdit: true,
			symbol: t.symbol,
			scenario: t.scenario,
			targetPrice: t.targetPrice,
			rationale: t.rationale
		}));
</script>

<svelte:head>
	<title>Price Targets - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

{#snippet headerActions()}
	<NativeButton class="btn-primary" onclick={openAdd}>Add Target</NativeButton>
{/snippet}

<div class="app-page-content vigil-deck-page portfolio-targets-page portfolio-modern-page">
	<vigil.ModernPageHeader title="Price Targets" actions={headerActions} />
	<div class="portfolio-container mx-auto max-w-5xl px-4 py-8">
		<vigil.Panel class="p-6">
			{#if data.targets.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<p>No targets found. Add your first price target to track your thesis.</p>
				</div>
			{:else}
				<div class="vigil-dense-list">
					{#each data.targets as target (target.id)}
						<div
							class="flex items-center justify-between rounded-lg border border-border bg-card/50 p-4"
						>
							<div>
								<p class="font-semibold">{target.symbol}</p>
								<p class="text-sm text-muted-foreground">{target.scenario} Case</p>
							</div>
							<div class="vigil-mono text-right tabular-nums">
								<p class="font-medium">${target.targetPrice}</p>
								<p class="text-sm text-muted-foreground">
									Range: ${target.lowPrice} - ${target.highPrice}
								</p>
							</div>
							<div class="flex gap-2">
								<NativeButton
									class="btn-secondary px-3 py-1 text-sm"
									onclick={() => openEdit(target)}>Edit</NativeButton
								>
								<form
									method="post"
									action="?/remove"
									class="contents"
									use:enhance={({ cancel }) => {
										// hx-confirm
										if (!confirm('Delete target for ' + target.symbol + '?')) cancel();
									}}
								>
									<input type="hidden" name="id" value={target.id} />
									<NativeButton
										type="submit"
										class="px-3 py-1 text-sm text-[var(--color-danger)] hover:underline"
										>Delete</NativeButton
									>
								</form>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</vigil.Panel>
		<div id="target-action-panel">
			{#if modal}
				<TargetFormModal vm={modal} onclose={() => (modal = null)} />
			{/if}
		</div>
	</div>
</div>
