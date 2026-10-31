<script lang="ts">
	// Port of pages/expenses/import.templ ImportReviewPanel. Every mapping
	// control re-posts the whole form to ?/preview after the same delays the
	// htmx triggers used (change delay:400ms selects, 600ms rates, checkbox at
	// once); the page swaps #import-review with the result.
	//
	// Oddity kept from Go: the "Include" column's checkbox *excludes* a row
	// when checked (name exclude_N), and is pre-checked + disabled for rows
	// that are not importable.
	import type { SubmitFunction } from '$app/forms';
	import { enhance } from '$app/forms';
	import { onDestroy } from 'svelte';
	import {
		EmptyState,
		FormErrorBanner,
		SecondaryButton,
		StatPill,
		SubmitButton
	} from '#lib/components/norviq/index.js';
	import { resolvePillars } from '../pillars.js';
	import { SELECTABLE_FIELDS, canCommit, type ImportReviewVM } from './vm.js';

	let { vm, submit }: { vm: ImportReviewVM; submit: SubmitFunction } = $props();

	let formEl = $state<HTMLFormElement | null>(null);
	let previewBtn = $state<HTMLButtonElement | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function schedulePreview(delay: number) {
		clearTimeout(timer);
		const run = () => {
			if (formEl && previewBtn) formEl.requestSubmit(previewBtn);
		};
		if (delay > 0) timer = setTimeout(run, delay);
		else run();
	}
	onDestroy(() => clearTimeout(timer));

	/** components.PillarOptions(selected) */
	function pillarOptions(selected: string) {
		const defs = selected.trim() !== '' ? resolvePillars(selected) : resolvePillars();
		return defs.map((p) => ({
			value: p.key,
			label: p.label,
			selected: p.key.toLowerCase() === selected.trim().toLowerCase()
		}));
	}
</script>

<FormErrorBanner message={vm.error} />
<form id="review-form" method="POST" action="?/preview" bind:this={formEl} use:enhance={submit}>
	<input type="hidden" name="session_id" value={vm.sessionID} />
	<input type="hidden" name="file_name" value={vm.fileName} />
	<input type="hidden" name="sheet_name" value={vm.sheetName} />
	<input type="hidden" name="amount_sign" value={vm.amountSign} />
	<input type="hidden" name="date_order" value={vm.dateOrder} />
	<button
		type="submit"
		formaction="?/preview"
		hidden
		tabindex="-1"
		aria-hidden="true"
		bind:this={previewBtn}
	></button>

	<section class="glass-card">
		<h3>{vm.fileName}</h3>
		<StatPill label="Rows" value={String(vm.totalRows)} />
		<StatPill label="Ready" value={String(vm.importableRows)} positive />
		{#if vm.duplicateRows > 0}
			<StatPill label="Already added" value={String(vm.duplicateRows)} />
		{/if}
		{#if vm.attentionRows > 0}
			<StatPill label="Needs a decision" value={String(vm.attentionRows)} />
		{/if}
		{#if vm.excludedRows > 0}
			<StatPill label="Excluded" value={String(vm.excludedRows)} />
		{/if}
		{#if vm.dateRange}
			<StatPill label="Dates" value={vm.dateRange} />
		{/if}
	</section>

	{#if vm.warnings.length > 0}
		<section class="glass-card">
			<h3>Worth checking</h3>
			<ul>
				{#each vm.warnings as warning, i (i)}
					<li>{warning}</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if vm.categories.length > 0}
		<section class="glass-card">
			<h3>Where do these belong?</h3>
			<p class="field-hint">We do not guess a pillar. Rows without one stay out of the import.</p>
			<table class="expenses-plan-table">
				<thead>
					<tr><th>From your sheet</th><th>Pillar</th></tr>
				</thead>
				<tbody>
					{#each vm.categories as category (category.sourceValue)}
						<tr>
							<td>{category.sourceValue}</td>
							<td>
								<select
									class="field-input"
									name={'pillar_' + category.sourceValue}
									onchange={() => schedulePreview(400)}
								>
									<option value="" selected={category.pillar === ''}>Choose…</option>
									{#each pillarOptions(category.pillar) as opt (opt.value)}
										<option value={opt.value} selected={opt.selected}>{opt.label}</option>
									{/each}
								</select>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/if}

	{#if vm.currencies.length > 0}
		<section class="glass-card">
			<h3>Exchange rates</h3>
			<p class="field-hint">
				These rows are in another currency. Without a rate they are left out rather than converted
				at face value.
			</p>
			{#each vm.currencies as currency (currency)}
				<label class="field-label" for={'rate_' + currency}>{currency}</label>
				<input
					id={'rate_' + currency}
					name={'rate_' + currency}
					type="text"
					inputmode="decimal"
					class="field-input"
					onchange={() => schedulePreview(600)}
				/>
			{/each}
		</section>
	{/if}

	<section class="glass-card">
		<h3>Columns</h3>
		<table class="expenses-plan-table">
			<thead>
				<tr><th>Column</th><th>Example</th><th>Import as</th></tr>
			</thead>
			<tbody>
				{#each vm.columns as column (column.letter)}
					<tr>
						<td>
							{column.header}
							{#if column.lowConfidence}
								<span class="field-hint">check this</span>
							{/if}
						</td>
						<td>{column.sample}</td>
						<td>
							<select
								class="field-input"
								name={'column_' + column.letter}
								onchange={() => schedulePreview(400)}
							>
								{#each SELECTABLE_FIELDS as field (field)}
									<option value={field} selected={column.field === field}>{field}</option>
								{/each}
							</select>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<section class="glass-card">
		<h3>
			{#if vm.truncated}
				{`First ${vm.rows.length} of ${vm.totalRows} rows`}
			{:else}
				Rows
			{/if}
		</h3>
		{#if vm.rows.length === 0}
			<EmptyState
				title="Nothing to import"
				description="We could not read any expense rows from that sheet."
			/>
		{:else}
			<table class="expenses-plan-table">
				<thead>
					<tr
						><th>Include</th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th
							>Status</th
						></tr
					>
				</thead>
				<tbody>
					{#each vm.rows as row (row.row)}
						<tr>
							<td>
								<input
									type="checkbox"
									name={'exclude_' + row.row}
									checked={!row.importable}
									disabled={!row.importable}
									onchange={() => schedulePreview(0)}
								/>
							</td>
							<td>{row.occurredOn}</td>
							<td>{row.title}</td>
							<td>{row.category}</td>
							<td>{row.amount}</td>
							<td>
								{row.statusLabel}
								{#if row.message}
									<span class="field-hint">{row.message}</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section class="glass-card">
		<SubmitButton disabled={!canCommit(vm)} formaction="?/commit">
			{`Import ${vm.importableRows} expenses`}
		</SubmitButton>
		<SecondaryButton type="submit" formaction="?/discard" formnovalidate>Cancel</SecondaryButton>
	</section>
</form>
