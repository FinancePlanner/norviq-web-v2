<script lang="ts">
	// The ⌘K command palette (DS 2.0 spec §4.2): every visible destination, the
	// common actions, and holdings by symbol from GET /dashboard/search, the
	// endpoint behind the Overview's AssetSearch. AppShell imports this file
	// lazily on the first opening; palette-state.svelte.ts holds the open state.
	import { untrack } from 'svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { Search } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { t } from '#lib/i18n/context.svelte.js';
	import { navContextFrom } from '#lib/nav/context.js';
	import type { SearchResultVM } from '#lib/features/dashboard/panels/types.js';
	import { closePalette, palette } from '../palette-state.svelte.js';
	import {
		paletteActions,
		paletteDestinations,
		rankPalette,
		type PaletteItem,
		type PaletteKind
	} from './palette.js';

	let dialog = $state<HTMLDialogElement | null>(null);
	let input = $state<HTMLInputElement | null>(null);
	let query = $state('');
	/** `query`, trimmed, 200ms after the last keystroke: what the symbol search sends. */
	let searched = $state('');
	let active = $state(0);

	const typed = $derived(query.trim());
	const items = $derived([
		...paletteActions(t),
		...paletteDestinations(t, navContextFrom(page.data))
	]);
	const local = $derived(rankPalette(query, items));

	$effect(() => {
		const q = typed;
		const timer = setTimeout(() => (searched = q), 200);
		return () => clearTimeout(timer);
	});

	// Throws on a failed response, so the error state shows; destinations and
	// actions never wait on it.
	const symbols = createQuery(() => ({
		queryKey: ['palette-search', searched],
		queryFn: async (): Promise<SearchResultVM[]> => {
			const res = await fetch('/dashboard/search?q=' + encodeURIComponent(searched), {
				headers: { accept: 'application/json' }
			});
			if (!res.ok) throw new Error(`/dashboard/search answered ${res.status}`);
			return ((await res.json()) as { results: SearchResultVM[] }).results;
		},
		enabled: searched !== '',
		retry: false,
		staleTime: 60_000,
		// The last results stay while the next keystroke's load.
		placeholderData: (previous: SearchResultVM[] | undefined) => previous
	}));

	const symbolRows = $derived<PaletteItem[]>(
		typed === ''
			? []
			: (symbols.data ?? []).map((row) => ({
					kind: 'symbol',
					label: row.name ? row.symbol + ' · ' + row.name : row.symbol,
					href: row.href
				}))
	);
	const symbolsPending = $derived(
		typed !== '' &&
			symbolRows.length === 0 &&
			!symbols.isError &&
			(searched !== typed || symbols.isFetching)
	);
	const symbolsFailed = $derived(typed !== '' && searched === typed && symbols.isError);

	const TITLES: Record<PaletteKind, string> = {
		destination: 'Go to',
		action: 'Actions',
		symbol: 'Holdings and symbols'
	};
	// Groups follow the ranking (the first match's group first), holdings last;
	// the arrow keys walk the rows in this rendered order.
	const groups = $derived.by(() => {
		const kinds: PaletteKind[] = [];
		for (const item of local) if (!kinds.includes(item.kind)) kinds.push(item.kind);
		const list = kinds.map((kind) => ({ kind, items: local.filter((i) => i.kind === kind) }));
		if (symbolRows.length > 0) list.push({ kind: 'symbol', items: symbolRows });
		let start = 0;
		return list.map((g) => {
			const group = { ...g, title: t(TITLES[g.kind]), start };
			start += g.items.length;
			return group;
		});
	});
	const rows = $derived(groups.flatMap((g) => g.items));
	const activeIndex = $derived(rows.length === 0 ? -1 : Math.min(active, rows.length - 1));

	const status = $derived(
		symbolsFailed
			? t('Symbol search is unavailable right now.')
			: symbolsPending
				? t('Searching…')
				: typed !== '' && rows.length === 0
					? t('No results for “%s”', typed)
					: ''
	);

	const optionId = (i: number) => `command-palette-option-${i}`;

	// palette.open drives the dialog: open it on every opening (the first one
	// right after this lazy mount), close it when someone else closed the palette.
	$effect(() => {
		const open = palette.open;
		if (!dialog) return;
		untrack(() => {
			if (!dialog) return;
			if (open && !dialog.open) {
				query = '';
				searched = '';
				active = 0;
				dialog.showModal();
				input?.focus();
			} else if (!open && dialog.open) {
				dialog.close();
			}
		});
	});

	// A new query starts at the top row.
	$effect(() => {
		void typed;
		active = 0;
	});

	$effect(() => {
		if (activeIndex < 0) return;
		document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
	});

	// Leaving the page (back button, a link elsewhere) takes the palette with it.
	let lastPath = page.url.pathname;
	$effect(() => {
		const path = page.url.pathname;
		if (path === lastPath) return;
		lastPath = path;
		untrack(close);
	});

	/** Closes the dialog first: focus cannot return to the page while it is modal. */
	function close() {
		dialog?.close();
		closePalette();
	}

	function go(item: PaletteItem) {
		close();
		void goto(item.href);
	}

	function onKeydown(e: KeyboardEvent) {
		const n = rows.length;
		if (e.key === 'ArrowDown' && n > 0) {
			e.preventDefault();
			active = (activeIndex + 1) % n;
		} else if (e.key === 'ArrowUp' && n > 0) {
			e.preventDefault();
			active = (activeIndex - 1 + n) % n;
		} else if (e.key === 'Enter' && activeIndex >= 0) {
			e.preventDefault();
			go(rows[activeIndex]);
		}
	}

	function onBackdrop(e: MouseEvent) {
		if (e.target === dialog) close();
	}
</script>

<dialog
	bind:this={dialog}
	class="command-palette glass-card"
	aria-label={t('Search and commands')}
	onclose={closePalette}
	onclick={onBackdrop}
>
	<div class="command-palette-layout">
		<div class="flex items-center gap-2 border-b border-border px-4">
			<Search class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
			<input
				bind:this={input}
				bind:value={query}
				type="text"
				role="combobox"
				class="h-12 min-w-0 flex-1 border-0 bg-transparent p-0 text-body text-foreground placeholder:text-muted-foreground focus:ring-0 focus:outline-none"
				placeholder={t('Search holdings, pages, actions')}
				aria-label={t('Search holdings, pages, actions')}
				aria-autocomplete="list"
				aria-expanded={rows.length > 0}
				aria-controls="command-palette-listbox"
				aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
				autocomplete="off"
				spellcheck="false"
				onkeydown={onKeydown}
			/>
		</div>
		<div
			id="command-palette-listbox"
			role="listbox"
			aria-label={t('Search results')}
			class="command-palette-results"
		>
			{#each groups as group (group.kind)}
				<div role="group" aria-labelledby="command-palette-group-{group.kind}" class="py-1">
					<div
						id="command-palette-group-{group.kind}"
						class="px-4 pt-2 pb-1 text-caption font-semibold text-muted-foreground"
					>
						{group.title}
					</div>
					{#each group.items as item, i (item.href)}
						{@const index = group.start + i}
						<div
							id={optionId(index)}
							role="option"
							tabindex="-1"
							aria-selected={index === activeIndex}
							class={[
								'mx-2 flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-subhead',
								index === activeIndex && 'bg-accent text-accent-foreground'
							]}
							onclick={() => go(item)}
							onkeydown={onKeydown}
							onmousedown={(e) => e.preventDefault()}
							onpointermove={() => (active = index)}
						>
							<span class="min-w-0 flex-1 truncate">{item.label}</span>
							{#if item.hint}
								<span class="shrink-0 text-caption text-muted-foreground">{item.hint}</span>
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		</div>
		<p role="status" class={['px-4 text-footnote text-muted-foreground', status && 'py-3']}>
			{status}
		</p>
	</div>
</dialog>

<style>
	.command-palette {
		width: min(36rem, calc(100vw - 1.5rem));
		max-height: min(70dvh, 32rem);
		margin: 12dvh auto auto;
		padding: 0;
		overflow: hidden;
		color: var(--foreground);
		background: var(--color-card-bg);
	}
	.command-palette:not([open]) {
		display: none;
	}
	.command-palette::backdrop {
		background: rgb(0 0 0 / 0.35);
	}
	.command-palette-layout {
		display: flex;
		flex-direction: column;
		max-height: inherit;
	}
	.command-palette-results {
		min-height: 0;
		overflow-y: auto;
		padding-bottom: 0.5rem;
	}
</style>
