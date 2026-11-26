<script lang="ts">
	// The review card for an update_holdings action (holdings Q read from an
	// attached screenshot or CSV). Every value is editable and only ticked rows
	// are saved: the confirm body is built from the rows as they stand here, so
	// what the user sees is what gets saved. All text from the model renders as
	// plain text.
	import { untrack } from 'svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import * as table from '#lib/components/norviq/tui/table/index.js';
	import {
		collidingSymbols,
		holdingsConfirmBody,
		holdingsListNameFromSummary,
		placeRowErrors,
		replaceLabel,
		rowBadge,
		rowProblem,
		type HoldingRow,
		type HoldingsConfirmBody,
		type HoldingsReview
	} from '../holdings.js';
	import { cellHint, formatDecimal, parseDecimal, type RowError } from '../trades.js';
	import type { PortfolioListOption } from '../types.js';

	let {
		actionID,
		summary,
		expiresAt,
		holdings,
		lists = [],
		busy,
		error,
		onsave,
		oncancel
	}: {
		actionID: string;
		/** The action summary ("Save 2 holdings to Main."), the only place that names the stored list. */
		summary: string;
		/** When the proposal lapses, as the generic card shows it. */
		expiresAt: string;
		holdings: HoldingsReview;
		lists?: PortfolioListOption[];
		busy: boolean;
		/** The last refusal; rowErrors index the rows that were sent. */
		error: { message: string; rowErrors: RowError[]; collisionSymbols?: string[] } | null;
		onsave: (body: HoldingsConfirmBody) => void;
		oncancel: () => void;
	} = $props();

	// The card is keyed on its action, so these start from the proposal and are owned here.
	// svelte-ignore state_referenced_locally
	let rows = $state<HoldingRow[]>(holdings.rows.map((r) => ({ ...r })));
	// svelte-ignore state_referenced_locally
	let listId = $state(
		lists.find((l) => same(l.id, holdings.portfolioListId))?.id ?? holdings.portfolioListId
	);
	let replaceExisting = $state(false);

	function same(a: string, b: string) {
		return a.toLowerCase() === b.toLowerCase();
	}

	// The destination must always be visible. When the lists lookup failed, or the
	// stored list is not among them, the name comes from the action summary.
	const storedName = $derived(holdingsListNameFromSummary(summary) || 'the proposed portfolio');
	const options = $derived<PortfolioListOption[]>(
		lists.some((l) => same(l.id, holdings.portfolioListId))
			? lists
			: [{ id: holdings.portfolioListId, name: storedName }, ...lists]
	);
	const destination = $derived(options.find((l) => l.id === listId)?.name ?? storedName);
	// What each row would replace was read for the stored list only.
	const onStoredList = $derived(same(listId, holdings.portfolioListId));

	/** Shows the number that will be sent: "1,5" becomes "1.5". Unreadable text is left for the row's message. */
	function tidy(row: HoldingRow, field: 'shares' | 'avgPrice') {
		if (row[field].trim() === '') return;
		const n = parseDecimal(row[field]);
		if (n !== undefined) row[field] = formatDecimal(n);
	}

	const kept = $derived(rows.filter((r) => r.keep));
	const problems = $derived(rows.map((r) => (r.keep ? rowProblem(r) : '')));
	const canSave = $derived(!busy && kept.length > 0 && problems.every((p) => p === ''));
	// Recomputed only when a new refusal arrives, against the rows that were sent.
	const placed = $derived.by(() =>
		error
			? untrack(() => placeRowErrors(rows, error.rowErrors))
			: { byRow: new Map<number, string[]>(), unplaced: [] as string[] }
	);
	const symbols = $derived(
		collidingSymbols(onStoredList ? rows : [], error?.collisionSymbols ?? [])
	);

	function save() {
		if (canSave) onsave(holdingsConfirmBody(holdings, rows, replaceExisting, listId));
	}
</script>

<div id={'assistant-action-' + actionID} class="assistant-action" data-holdings-card>
	<p class="assistant-kicker">Review holdings</p>
	<p class="mt-1 text-xs text-muted-foreground">
		{holdings.fromCsv
			? 'Check each row against your CSV. Only ticked rows are saved.'
			: 'Check each row against your file. Only ticked rows are saved.'}
	</p>
	<p class="mt-1 text-xs text-muted-foreground">Expires {expiresAt}</p>

	{#if options.length > 1}
		<label class="mt-3 flex items-center gap-2 text-sm">
			<span>Portfolio</span>
			<select
				class="rounded border bg-transparent px-2 py-1"
				bind:value={listId}
				disabled={busy}
				aria-label="Portfolio"
			>
				{#each options as list (list.id)}
					<option value={list.id}>{list.name}</option>
				{/each}
			</select>
		</label>
	{:else}
		<p class="mt-3 text-sm">Saving to <strong>{destination}</strong></p>
	{/if}

	<fieldset disabled={busy} class="mt-3 min-w-0 border-0 p-0">
		<div class="overflow-x-auto">
			<table.Table class="csv-preview-table w-full text-sm">
				<thead>
					<tr>
						<th class="text-left">Keep</th>
						<th class="text-left">Symbol</th>
						<th class="text-left">Shares</th>
						<th class="text-left">Avg cost</th>
						<th class="text-left">Buy date</th>
						<th class="text-left">Notes</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row, i (i)}
						{@const rowErrors = placed.byRow.get(i) ?? []}
						{@const sHint = cellHint(row.shares, holdings.rows[i]?.shares)}
						{@const pHint = cellHint(row.avgPrice, holdings.rows[i]?.avgPrice)}
						<tr class={rowErrors.length > 0 ? 'bg-[var(--color-warning)]/5' : undefined}>
							<td>
								<input type="checkbox" bind:checked={row.keep} aria-label={'Save ' + row.symbol} />
							</td>
							<td>
								<input
									class="w-24 rounded border bg-transparent px-2 py-1"
									type="text"
									bind:value={row.symbol}
									aria-label="Symbol"
								/>
							</td>
							<td>
								<input
									class="w-24 rounded border bg-transparent px-2 py-1"
									type="text"
									inputmode="decimal"
									bind:value={row.shares}
									onblur={() => tidy(row, 'shares')}
									aria-label="Shares"
								/>
								{#if sHint}
									<p
										class={[
											'mt-0.5 text-xs',
											sHint.warn ? 'text-[var(--color-warning)]' : 'text-muted-foreground'
										]}
									>
										{sHint.text}
									</p>
								{/if}
							</td>
							<td>
								<input
									class="w-24 rounded border bg-transparent px-2 py-1"
									type="text"
									inputmode="decimal"
									bind:value={row.avgPrice}
									onblur={() => tidy(row, 'avgPrice')}
									aria-label="Average cost"
								/>
								{#if pHint}
									<p
										class={[
											'mt-0.5 text-xs',
											pHint.warn ? 'text-[var(--color-warning)]' : 'text-muted-foreground'
										]}
									>
										{pHint.text}
									</p>
								{/if}
							</td>
							<td>
								<input
									class="w-36 rounded border bg-transparent px-2 py-1"
									type="date"
									bind:value={row.buyDate}
									aria-label="Buy date"
								/>
							</td>
							<td class="text-xs text-muted-foreground">
								{#if onStoredList}
									<p>{rowBadge(row)}</p>
								{/if}
								{#if problems[i]}
									<p class="text-[var(--color-danger)]">{problems[i]}</p>
								{/if}
								{#each rowErrors as message, k (k)}
									<p class="text-[var(--color-danger)]" role="alert">{message}</p>
								{/each}
							</td>
						</tr>
					{/each}
				</tbody>
			</table.Table>
		</div>
	</fieldset>

	<label
		class="mt-3 flex items-start gap-2 rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 p-3 text-sm"
	>
		<input type="checkbox" class="mt-0.5" bind:checked={replaceExisting} disabled={busy} />
		<span>{replaceLabel(symbols)}</span>
	</label>

	{#if error}
		<div class="mt-3 text-sm text-[var(--color-danger)]" role="alert">
			<p>{error.message}</p>
			{#each placed.unplaced as message, k (k)}
				<p>{message}</p>
			{/each}
		</div>
	{/if}

	<div class="assistant-action-controls">
		<NativeButton class="assistant-confirm" disabled={!canSave} onclick={save}>
			{kept.length === 1 ? 'Save 1 holding' : `Save ${kept.length} holdings`}
		</NativeButton>
		<NativeButton class="assistant-cancel" disabled={busy} onclick={oncancel}>Cancel</NativeButton>
	</div>
</div>
