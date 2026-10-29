<script lang="ts">
	// pages/portfolio/screenshot_import.templ ScreenshotImportPreviewPanel — the
	// review step; every extracted value is an editable input.
	//
	// Go nested the commit <form> inside the upload form and gathered the review
	// inputs with hx-include. Nested forms are invalid in Svelte, so the commit
	// block is a <div> and its button posts the surrounding form to ?/commit
	// (the upload page drops the image files from that submission).
	import { FormErrorBanner, SubmitButton } from '#lib/components/norviq/index.js';
	import * as table from '#lib/components/norviq/tui/table/index.js';
	import { conflictSymbols, hasCostBasis, kindLabel, lowConfidence, screenshotImportSummary, type ScreenshotImportVM } from './screenshot.js';

	let { vm }: { vm: ScreenshotImportVM } = $props();
	const conflicts = $derived(conflictSymbols(vm));
</script>

{#if vm.error}
	<FormErrorBanner message={vm.error} />
{/if}
{#if vm.errors.length > 0}
	<ul class="space-y-1 text-sm text-[var(--color-warning)]">
		{#each vm.errors as msg, i (i)}
			<li>{msg}</li>
		{/each}
	</ul>
{/if}
{#if vm.committed}
	<div class="rounded-lg border border-[var(--color-success)]/30 p-4">
		<p class="font-semibold text-[var(--color-success)]">Import complete</p>
		<p class="mt-1 text-sm text-muted-foreground">
			{screenshotImportSummary(vm.inserted, vm.updated)}
		</p>
		{#if vm.replacedSymbols.length > 0}
			<p class="mt-1 text-sm text-muted-foreground">
				Replaced previously imported positions: {vm.replacedSymbols.join(', ')}
			</p>
		{/if}
	</div>
{:else if vm.rows.length > 0}
	<div class="space-y-4">
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<span class="rounded-full bg-muted px-3 py-1">{kindLabel(vm)}</span>
			<span class="text-muted-foreground">
				{vm.rows.length} positions from {vm.imageCount} image(s)
			</span>
		</div>
		{#if !hasCostBasis(vm)}
			<p class="rounded-lg border border-[var(--color-warning)]/30 p-3 text-sm">
				A holdings screen shows what you own now, not what you paid. Purchase prices were left blank rather than guessed —
				fill them in if you want accurate gains.
			</p>
		{/if}
		<div class="overflow-x-auto">
			<table.Table class="csv-preview-table w-full text-sm">
				<thead>
					<tr>
						<th class="text-left">Symbol</th>
						<th class="text-left">Shares</th>
						<th class="text-left">Buy price</th>
						<th class="text-left">Buy date</th>
						<th class="text-left">Notes</th>
						<th class="text-left">Keep</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.rows as row, i (i)}
						<tr class={lowConfidence(row) ? 'bg-[var(--color-warning)]/5' : undefined}>
							<td>
								<input
									class="w-24 rounded border bg-transparent px-2 py-1"
									type="text"
									name={'row_symbol_' + i}
									value={row.symbol}
									aria-label="Symbol"
								/>
								<input type="hidden" name={'row_existing_' + i} value={row.existing} />
							</td>
							<td>
								<input
									class="w-24 rounded border bg-transparent px-2 py-1"
									type="text"
									inputmode="decimal"
									name={'row_shares_' + i}
									value={row.shares}
									aria-label="Shares"
								/>
							</td>
							<td>
								<input
									class="w-28 rounded border bg-transparent px-2 py-1"
									type="text"
									inputmode="decimal"
									name={'row_buy_price_' + i}
									value={row.buyPrice}
									aria-label="Buy price"
								/>
							</td>
							<td>
								<input
									class="w-36 rounded border bg-transparent px-2 py-1"
									type="date"
									name={'row_buy_date_' + i}
									value={row.buyDate}
									aria-label="Buy date"
								/>
							</td>
							<td class="text-muted-foreground">
								{#if row.willReplace}
									<span class="text-[var(--color-warning)]">Replaces imported position</span>
								{:else if row.existing === 'manual'}
									<span>You already hold this manually</span>
								{:else if lowConfidence(row)}
									<span class="text-[var(--color-warning)]">Hard to read — check</span>
								{/if}
							</td>
							<td>
								<input type="checkbox" name={'row_keep_' + i} value="1" checked aria-label={'Import ' + row.symbol} />
							</td>
						</tr>
					{/each}
				</tbody>
			</table.Table>
		</div>
		<div data-commit-form>
			<input type="hidden" name="row_count" value={vm.rows.length} />
			{#if conflicts.length > 0}
				<label
					class="mb-3 flex items-start gap-2 rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 p-3 text-sm"
				>
					<input type="checkbox" name="confirm_merge_existing" value="1" class="mt-0.5" checked={vm.needsMergeConfirm} />
					<span>
						Replace positions you already hold in
						{conflicts.join(', ')}
						. Without this, the import stops rather than leaving two rows for the same symbol.
					</span>
				</label>
			{/if}
			<SubmitButton class="portfolio-form-save" formaction="?/commit" formnovalidate>Import checked positions</SubmitButton>
		</div>
	</div>
{/if}
