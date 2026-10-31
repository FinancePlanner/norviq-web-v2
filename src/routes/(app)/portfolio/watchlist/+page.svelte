<script lang="ts">
	// pages/portfolio/subpages.templ WatchlistPage (handlers.PortfolioWatchlist).
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { createQuery } from '@tanstack/svelte-query';
	import { onMount } from 'svelte';
	import Button from '#lib/components/norviq/tui/Button.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import PinesSearchField from '#lib/components/norviq/PinesSearchField.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import * as dialog from '#lib/components/norviq/tui/dialog/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import QuoteRefreshStatus from '#lib/features/portfolio/QuoteRefreshStatus.svelte';
	import WatchlistCSVImportPanel from '#lib/features/portfolio/watchlist/WatchlistCSVImportPanel.svelte';
	import WatchlistItemEditForm from '#lib/features/portfolio/watchlist/WatchlistItemEditForm.svelte';
	import WatchlistListPanel from '#lib/features/portfolio/watchlist/WatchlistListPanel.svelte';
	import WatchlistRowsPanel from '#lib/features/portfolio/watchlist/WatchlistRowsPanel.svelte';
	import WatchlistSearchResults from '#lib/features/portfolio/watchlist/WatchlistSearchResults.svelte';
	import {
		WATCHLIST_SORT_KEY,
		parseWatchlistSort,
		type WatchlistSort
	} from '#lib/features/portfolio/watchlist/sort.js';
	import {
		emptyCSVImportVM,
		watchlistListForm,
		type WatchlistItemEditVM,
		type WatchlistQuoteVM,
		type WatchlistQuotesResponse,
		type WatchlistRowVM,
		type WatchlistSearchResultVM
	} from '#lib/features/portfolio/watchlist/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);

	// Removed rows disappear at once (Go: hx-swap outerHTML) until the reload lands.
	let removed = $state<Set<string>>(new Set());
	const rows = $derived(vm.rows.filter((r) => !removed.has(r.id)));

	// watchlistPage(): sort persisted in localStorage, applied after mount.
	let sort = $state<WatchlistSort>('name');
	onMount(() => {
		try {
			sort = parseWatchlistSort(localStorage.getItem(WATCHLIST_SORT_KEY));
		} catch {
			/* storage blocked */
		}
	});
	function applySort() {
		try {
			localStorage.setItem(WATCHLIST_SORT_KEY, sort);
		} catch {
			/* storage blocked */
		}
	}

	// Quote poll: "load, every 20s [visible], visibilitychange [visible]".
	const quotesQuery = createQuery(() => ({
		queryKey: ['portfolio-watchlist-quotes', vm.selectedListID],
		queryFn: async (): Promise<WatchlistQuotesResponse | null> => {
			const res = await fetch(
				'/portfolio/watchlist/quotes?list=' + encodeURIComponent(vm.selectedListID),
				{
					headers: { accept: 'application/json' }
				}
			);
			if (!res.ok) return null;
			return (await res.json()) as WatchlistQuotesResponse;
		},
		refetchInterval: 20_000,
		refetchOnWindowFocus: true,
		staleTime: 0
	}));
	const quotes = $derived(
		new Map<string, WatchlistQuoteVM>((quotesQuery.data?.rows ?? []).map((q) => [q.id, q]))
	);
	const updatedAt = $derived(quotesQuery.data?.updatedAt ?? '');

	// Add dialog: market search (Go: GET /portfolio/watchlist/search → /v1/assets/search?limit=8).
	let addOpen = $state(false);
	let query = $state('');
	let searched = $state('');
	const searchQuery = createQuery(() => ({
		queryKey: ['portfolio-watchlist-search', searched],
		enabled: searched !== '',
		queryFn: async (): Promise<WatchlistSearchResultVM[]> => {
			const res = await fetch('/api/v1/assets/search?limit=8&q=' + encodeURIComponent(searched), {
				headers: { accept: 'application/json' }
			});
			if (!res.ok) return [];
			const items = (await res.json()) as { symbol?: string; name?: string; exchange?: string }[];
			return (items ?? [])
				.map((r) => ({
					symbol: (r.symbol ?? '').trim(),
					name: (r.name ?? '').trim(),
					exchange: (r.exchange ?? '').trim()
				}))
				.filter((r) => r.symbol !== '');
		}
	}));

	// Note edit dialog (Go: hx-get /portfolio/watchlist/items/{id}/edit into #watchlist-edit-panel).
	let editVM = $state<WatchlistItemEditVM | null>(null);
	let editOpen = $state(false);
	function openEdit(row: WatchlistRowVM) {
		editVM = { itemID: row.id, listID: vm.selectedListID, symbol: row.symbol, note: row.note };
		editOpen = true;
	}

	// DELETE /portfolio/watchlist/items/{id} → backend DELETE /v1/watchlist/{id}.
	async function removeRow(row: WatchlistRowVM) {
		if (!confirm('Remove ' + row.symbol + ' from watchlist?')) return;
		const res = await fetch('/api/v1/watchlist/' + encodeURIComponent(row.id), {
			method: 'DELETE'
		}).catch(() => null);
		if (!res || (res.status !== 204 && res.status !== 200)) return;
		removed = new Set([...removed, row.id]);
		await invalidateAll();
	}

	// Theme dialog: GET /portfolio/watchlist/list[/id] and /import/csv?list=id fragments.
	type ListAction = { kind: 'list'; listID: string } | { kind: 'csv'; listID: string };
	let listAction = $state<ListAction | null>(null);
	let listActionKey = $state(0);
	let listOpen = $state(false);
	function openListAction(next: ListAction) {
		listAction = next;
		listActionKey++;
		listOpen = true;
	}
	const csvListName = (listID: string) => vm.lists.find((l) => l.id === listID)?.name ?? '';
</script>

<svelte:head>
	<title>Watchlist - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

{#snippet addButton()}
	<dialog.Trigger for="watchlist-add-dialog">
		<Button class="portfolio-add-btn w-auto px-5">Add symbol</Button>
	</dialog.Trigger>
{/snippet}

<div class="app-page-content vigil-canvas-page portfolio-watchlist-page portfolio-modern-page">
	<vigil.ModernPageHeader title="Watchlist" actions={addButton} />
	<div class="vigil-command-split is-aside-first">
		<vigil.CommandSplitAside>
			<aside id="watchlist-lists-sidebar" class="glass-card p-4">
				<div class="flex items-center justify-between gap-2">
					<p class="field-label">Themes</p>
					<NativeButton
						class="btn-secondary px-2 py-1 text-xs"
						data-tui-dialog-trigger=""
						data-tui-dialog-target="list-action-dialog"
						onclick={() => openListAction({ kind: 'list', listID: '' })}>New</NativeButton
					>
				</div>
				<ul class="mt-3 space-y-1">
					{#each vm.lists as list (list.id)}
						<li class="flex items-center gap-1">
							<a
								href={list.href}
								class={(list.active
									? 'watchlist-list-btn watchlist-list-btn-active block w-full text-left'
									: 'watchlist-list-btn block w-full text-left') + ' min-w-0 flex-1'}
							>
								{list.name}
							</a>
							<NativeButton
								class="btn-secondary shrink-0 px-2 py-1 text-xs"
								aria-label={'Import CSV into theme ' + list.name}
								data-tui-dialog-trigger=""
								data-tui-dialog-target="list-action-dialog"
								onclick={() => openListAction({ kind: 'csv', listID: list.id })}
								>Import</NativeButton
							>
							<NativeButton
								class="btn-secondary shrink-0 px-2 py-1 text-xs"
								aria-label={'Edit theme ' + list.name}
								data-tui-dialog-trigger=""
								data-tui-dialog-target="list-action-dialog"
								onclick={() => openListAction({ kind: 'list', listID: list.id })}>Edit</NativeButton
							>
						</li>
					{/each}
				</ul>
			</aside>
		</vigil.CommandSplitAside>
		<div class="vigil-command-split-main">
			<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
				<QuoteRefreshStatus id="watchlist-quotes-updated" {updatedAt} />
				<label class="portfolio-sort flex items-center gap-2 text-sm text-muted-foreground">
					<span>Sort</span>
					<SelectField
						bind:value={sort}
						onchange={applySort}
						options={[
							{ value: 'name', label: 'Name' },
							{ value: 'gains', label: 'Gains' },
							{ value: 'weight', label: '% of portfolio' }
						]}
					/>
				</label>
				<div id="watchlist-quote-refresh" aria-hidden="true"></div>
			</div>
			<div id="watchlist-rows-panel">
				<WatchlistRowsPanel {vm} {rows} {sort} {quotes} onedit={openEdit} onremove={removeRow} />
			</div>
		</div>
	</div>

	<!-- watchlistAddDialog -->
	<dialog.Dialog id="watchlist-add-dialog" bind:open={addOpen}>
		<dialog.Content class="glass-card border-0 sm:max-w-lg">
			<dialog.Header>
				<dialog.Title>Add to watchlist</dialog.Title>
			</dialog.Header>
			<form
				class="space-y-4"
				method="POST"
				action="?/add"
				use:enhance={() =>
					async ({ result, update }) => {
						// Go: HX-Trigger watchlist-added closed this dialog; failures swapped nothing.
						if (result.type !== 'success') return;
						addOpen = false;
						await update();
					}}
			>
				<input type="hidden" name="list_id" value={vm.selectedListID} />
				<PinesSearchField
					resultsId="watchlist-search-results"
					bind:query
					onsearch={(q) => (searched = q.trim())}
				>
					{#snippet results()}
						<WatchlistSearchResults
							results={searched === '' ? [] : (searchQuery.data ?? [])}
							query={searched}
						/>
					{/snippet}
				</PinesSearchField>
				<p class="text-sm text-muted-foreground">
					Pick a symbol from search results to add it to this list.
				</p>
			</form>
		</dialog.Content>
	</dialog.Dialog>

	<!-- watchlistEditModal -->
	<dialog.Dialog id="watchlist-edit-dialog" bind:open={editOpen}>
		<dialog.Content class="glass-card vigil-modal-panel border-0 p-6 sm:max-w-2xl md:p-8">
			<div id="watchlist-edit-panel">
				{#if editVM}
					{#key editVM}
						<WatchlistItemEditForm vm={editVM} />
					{/key}
				{/if}
			</div>
		</dialog.Content>
	</dialog.Dialog>

	<!-- listActionModal -->
	<dialog.Dialog id="list-action-dialog" bind:open={listOpen}>
		<dialog.Content class="glass-card vigil-modal-panel border-0 p-6 sm:max-w-2xl md:p-8">
			<div id="list-action-panel">
				{#key listActionKey}
					{#if listAction?.kind === 'list'}
						<WatchlistListPanel vm={watchlistListForm(vm.lists, listAction.listID)} />
					{:else if listAction?.kind === 'csv'}
						<WatchlistCSVImportPanel
							vm={emptyCSVImportVM(listAction.listID, csvListName(listAction.listID))}
						/>
					{/if}
				{/key}
			</div>
		</dialog.Content>
	</dialog.Dialog>
</div>
