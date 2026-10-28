<script lang="ts">
	// expenses.BulkTargetsPage (internal/pages/expenses/bulk.templ). A plain
	// full-page POST, as in Go (no htmx on this form).
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { CheckboxField, EmptyState, Field, SelectField, SubmitButton } from '#lib/components/norviq/index.js';
	import type { Option } from '#lib/components/norviq/types.js';
	import { formatFloat } from '#lib/format.js';

	let { data } = $props();

	/** targetTypeOptions (internal/pages/expenses/viewmodel.go) */
	function targetTypeOptions(selected: string): Option[] {
		return [
			{ value: 'fixed', label: 'Fixed amount', selected: selected !== 'percentageIncome' },
			{ value: 'percentageIncome', label: '% of income', selected: selected === 'percentageIncome' }
		];
	}
</script>

<svelte:head>
	<title>Bulk budget targets - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-canvas-page expenses-modern-page">
	<vigil.ModernPageHeader title="Bulk target editor" subtitle={data.monthLabel}>
		{#snippet actions()}
			<a class="btn-secondary" href={'/expenses?month=' + data.monthQuery}>Back to planner</a>
		{/snippet}
	</vigil.ModernPageHeader>
	{#if data.drift === null}
		<vigil.Panel class="mt-6 rounded-lg p-6" titleID="bulk-empty-panel">
			<EmptyState
				title="No budget targets"
				description="Create a monthly budget before using bulk editing."
				actionLabel="Back"
				actionHref="/expenses"
			/>
		</vigil.Panel>
	{:else}
		<vigil.CommandSplit class="mt-6">
			<vigil.CommandSplitMain>
				<vigil.Panel class="rounded-lg p-6" titleID="bulk-form-panel">
					<form method="post" action="/expenses/bulk">
						<input type="hidden" name="snapshot_id" value={data.drift.snapshotID} />
						<input type="hidden" name="revision" value={String(data.drift.revision)} />
						<input type="hidden" name="month" value={data.monthQuery} />
						<div class="space-y-3">
							{#each data.planItems as item (item.id)}
								<div class="grid items-center gap-3 rounded-lg bg-black/5 p-4 md:grid-cols-[1fr_9rem_9rem_8rem_8rem_11rem] dark:bg-white/5">
									<div><p class="font-semibold">{item.title}</p><p class="text-xs text-muted-foreground">{item.pillar}</p></div>
									<Field
										name={'amount_' + item.id}
										label="Monthly target"
										type="number"
										value={formatFloat(item.plannedValue, 2)}
										required
										class="mt-1"
										min="0"
										step="0.01"
									/>
									<SelectField
										name={'type_' + item.id}
										label="Target type"
										class="mt-1"
										options={targetTypeOptions(item.targetType)}
									/>
									<Field
										name={'percentage_' + item.id}
										label="Income %"
										type="number"
										value={item.incomePercentage}
										placeholder="—"
										class="mt-1"
										min="0"
										max="1000"
										step="0.1"
									/>
									<Field
										name={'threshold_' + item.id}
										label="Alert drift %"
										type="number"
										value={item.thresholdOverride}
										placeholder="Default"
										class="mt-1"
										min="0"
										max="1000"
										step="0.1"
									/>
									<CheckboxField
										name={'eligible_' + item.id}
										label="Eligible for reallocation"
										value="true"
										checked={item.reallocationEligible}
										wrapperClass="text-sm"
									/>
								</div>
							{/each}
						</div>
						<div class="mt-5 flex justify-end">
							<SubmitButton>Save all targets</SubmitButton>
						</div>
					</form>
				</vigil.Panel>
			</vigil.CommandSplitMain>
			<vigil.CommandSplitAside>
				<vigil.Panel class="rounded-lg p-5" titleID="bulk-help-panel">
					<p class="command-metric-label">Bulk editing</p>
					<p class="mt-3 text-sm text-muted-foreground">Adjust every pillar target in one pass. Changes apply to the current month snapshot.</p>
					<p class="mt-4 text-xs text-muted-foreground">{data.planItems.length} line items</p>
				</vigil.Panel>
			</vigil.CommandSplitAside>
		</vigil.CommandSplit>
	{/if}
</div>
