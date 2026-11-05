<script lang="ts">
	// The review card for a record_trades action (a broker screenshot read by
	// the assistant). Every value is editable and only ticked rows are saved:
	// the confirm body is built from the rows as they stand here, so what the
	// user sees is what gets saved. All text from the model renders as plain
	// text.
	import { untrack } from 'svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import * as table from '#lib/components/norviq/tui/table/index.js';
	import {
		canBeKept,
		isLowConfidence,
		keptRows,
		placeRowErrors,
		rowProblem,
		listNameFromSummary,
		formatDecimal,
		parseDecimal,
		savesAs,
		skippedRowsText,
		SYNCED_COPY,
		tradesConfirmBody,
		type RowError,
		type TradeRow,
		type TradesProposal
	} from '../trades.js';
	import type { PortfolioListOption } from '../types.js';

	let {
		actionID,
		summary,
		trades,
		lists = [],
		busy,
		error,
		onsave,
		oncancel
	}: {
		actionID: string;
		/** The action summary ("Record 2 buys in Main."), the only place that names the stored list. */
		summary: string;
		trades: TradesProposal;
		lists?: PortfolioListOption[];
		busy: boolean;
		/** The last refusal; rowErrors index the rows that were sent. */
		error: { message: string; rowErrors: RowError[] } | null;
		onsave: (body: { portfolioListId: string; trades: unknown[] }) => void;
		oncancel: () => void;
	} = $props();

	// The card is keyed on its action, so these start from the proposal and are owned here.
	// svelte-ignore state_referenced_locally
	let rows = $state<TradeRow[]>(trades.rows.map((r) => ({ ...r, issues: [...r.issues] })));
	// svelte-ignore state_referenced_locally
	let listId = $state(
		lists.find((l) => same(l.id, trades.portfolioListId))?.id ?? trades.portfolioListId
	);

	function same(a: string, b: string) {
		return a.toLowerCase() === b.toLowerCase();
	}

	// The destination must always be visible. When the lists lookup failed, or the
	// stored list is not among them, the name comes from the action summary.
	const storedName = $derived(listNameFromSummary(summary) || 'the proposed portfolio');
	const options = $derived<PortfolioListOption[]>(
		lists.some((l) => same(l.id, trades.portfolioListId))
			? lists
			: [{ id: trades.portfolioListId, name: storedName }, ...lists]
	);
	const destination = $derived(options.find((l) => l.id === listId)?.name ?? storedName);

	/** Shows the number that will be sent: "1,5" becomes "1.5". Unreadable text is left for the row's message. */
	function tidy(row: TradeRow, field: 'quantity' | 'price' | 'fees') {
		const raw = row[field];
		if (raw === undefined || raw.trim() === '') return;
		const n = parseDecimal(raw);
		if (n !== undefined) row[field] = formatDecimal(n);
	}

	const proposal = $derived<TradesProposal>({ ...trades, portfolioListId: listId, rows });
	// Only the list the stored preview found synced blocks saving. Web cannot tell
	// whether another list is synced; the backend refuses that on save.
	const blockedBySync = $derived(trades.synced && same(listId, trades.portfolioListId));
	const kept = $derived(keptRows(proposal));
	const problems = $derived(rows.map((r) => (r.keep && canBeKept(r) ? rowProblem(r) : '')));
	const canSave = $derived(
		!busy && !blockedBySync && kept.length > 0 && problems.every((p) => p === '')
	);
	// Recomputed only when a new refusal arrives, against the rows that were sent.
	const placed = $derived.by(() =>
		error
			? untrack(() => placeRowErrors(proposal, error.rowErrors))
			: { byRow: new Map<number, string[]>(), unplaced: [] as string[] }
	);
	const skipped = $derived(skippedRowsText(trades.skippedRows));

	function save() {
		if (canSave) onsave(tradesConfirmBody(proposal));
	}
</script>

<div id={'assistant-action-' + actionID} class="assistant-action" data-trades-card>
	<p class="assistant-kicker">Review trades</p>
	<p class="mt-1 text-xs text-muted-foreground">
		Check each row against your screenshot. Only ticked rows are saved.
	</p>

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

	{#if blockedBySync}
		<p class="mt-3 text-sm font-semibold text-[var(--color-danger)]" role="alert">{SYNCED_COPY}</p>
	{/if}

	<fieldset disabled={busy} class="mt-3 min-w-0 border-0 p-0">
		<div class="overflow-x-auto">
			<table.Table class="csv-preview-table w-full text-sm">
				<thead>
					<tr>
						<th class="text-left">Keep</th>
						<th class="text-left">Side</th>
						<th class="text-left">Symbol</th>
						<th class="text-left">Shares</th>
						<th class="text-left">Price</th>
						<th class="text-left">Date</th>
						<th class="text-left">Currency</th>
						<th class="text-left">Fees</th>
						<th class="text-left">Notes</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row, i (i)}
						{@const recorded = !canBeKept(row)}
						{@const rowErrors = placed.byRow.get(i) ?? []}
						<tr
							class={isLowConfidence(row) || rowErrors.length > 0
								? 'bg-[var(--color-warning)]/5'
								: undefined}
						>
							<td>
								<input
									type="checkbox"
									bind:checked={row.keep}
									disabled={recorded}
									aria-label={'Save ' + row.symbol}
								/>
							</td>
							<td>
								<select
									class="w-[4.5rem] rounded border bg-transparent px-2 py-1"
									bind:value={row.side}
									aria-label="Side"
									disabled={recorded}
								>
									<option value="buy">Buy</option>
									<option value="sell">Sell</option>
								</select>
							</td>
							<td>
								<input
									class="w-20 rounded border bg-transparent px-2 py-1"
									type="text"
									bind:value={row.symbol}
									aria-label="Symbol"
									disabled={recorded}
								/>
							</td>
							<td>
								<input
									class="w-20 rounded border bg-transparent px-2 py-1"
									type="text"
									inputmode="decimal"
									bind:value={row.quantity}
									onblur={() => tidy(row, 'quantity')}
									aria-label="Shares"
									disabled={recorded}
								/>
								{#if savesAs(row.quantity ?? '')}
									<p class="mt-0.5 text-xs text-muted-foreground">
										Saves as {savesAs(row.quantity ?? '')}
									</p>
								{/if}
							</td>
							<td>
								<input
									class="w-24 rounded border bg-transparent px-2 py-1"
									type="text"
									inputmode="decimal"
									bind:value={row.price}
									onblur={() => tidy(row, 'price')}
									aria-label="Price"
									disabled={recorded}
								/>
								{#if savesAs(row.price ?? '')}
									<p class="mt-0.5 text-xs text-muted-foreground">
										Saves as {savesAs(row.price ?? '')}
									</p>
								{/if}
							</td>
							<td>
								<input
									class="w-36 rounded border bg-transparent px-2 py-1"
									type="date"
									bind:value={row.tradeDate}
									aria-label="Date"
									disabled={recorded}
								/>
							</td>
							<td>
								<input
									class="w-16 rounded border bg-transparent px-2 py-1"
									type="text"
									maxlength={3}
									placeholder={trades.baseCurrency}
									bind:value={row.currency}
									aria-label="Currency"
									disabled={recorded}
								/>
							</td>
							<td>
								<input
									class="w-16 rounded border bg-transparent px-2 py-1"
									type="text"
									inputmode="decimal"
									bind:value={row.fees}
									onblur={() => tidy(row, 'fees')}
									aria-label="Fees"
									disabled={recorded}
								/>
								{#if savesAs(row.fees ?? '')}
									<p class="mt-0.5 text-xs text-muted-foreground">
										Saves as {savesAs(row.fees ?? '')}
									</p>
								{/if}
							</td>
							<td class="text-xs text-muted-foreground">
								{#if isLowConfidence(row)}
									<p class="text-[var(--color-warning)]">Hard to read — check</p>
								{/if}
								{#each row.issues as issue, k (k)}
									<p
										class={issue.blocking
											? 'text-[var(--color-danger)]'
											: 'text-[var(--color-warning)]'}
									>
										{issue.message}
									</p>
								{/each}
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

	{#if skipped}
		<p class="mt-2 text-xs text-muted-foreground">{skipped}</p>
	{/if}

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
			{kept.length === 1 ? 'Save 1 trade' : `Save ${kept.length} trades`}
		</NativeButton>
		<NativeButton class="assistant-cancel" disabled={busy} onclick={oncancel}>Cancel</NativeButton>
	</div>
</div>
