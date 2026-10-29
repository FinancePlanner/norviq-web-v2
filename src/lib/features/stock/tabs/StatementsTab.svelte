<script lang="ts">
	// stock.StatementsTab
	import { EmptyState, SectionCard } from '#lib/components/norviq/index.js';
	import StatementTable from './StatementTable.svelte';
	import type { StatementsTabVM } from '../detail.js';

	let { vm }: { vm: StatementsTabVM } = $props();
</script>

<div class="mt-6 grid gap-4 lg:grid-cols-2">
	<SectionCard title="Balance sheet">
		{#if vm.error !== ''}
			<p class="mt-2 text-sm text-[var(--color-danger)]">{vm.error}</p>
		{:else if vm.balanceSheet.length > 0}
			{#if vm.balancePeriod !== ''}<p class="stock-statement-period">{vm.balancePeriod}</p>{/if}
			<StatementTable rows={vm.balanceSheet} />
		{:else}
			<EmptyState
				title="No balance sheet data"
				description="Annual balance sheet figures will appear here."
			/>
		{/if}
	</SectionCard>
	<SectionCard title="Cash flow">
		{#if vm.cashFlow.length > 0}
			{#if vm.cashFlowPeriod !== ''}<p class="stock-statement-period">{vm.cashFlowPeriod}</p>{/if}
			<StatementTable rows={vm.cashFlow} />
		{:else}
			<EmptyState
				title="No cash flow data"
				description="Annual cash flow figures will appear here."
			/>
		{/if}
	</SectionCard>
	<div class="lg:col-span-2">
		<SectionCard title="Key ratios">
			{#if vm.ratioRows.length > 0}
				{#if vm.ratiosPeriod !== ''}<p class="stock-statement-period">{vm.ratiosPeriod}</p>{/if}
				<StatementTable rows={vm.ratioRows} />
			{:else}
				<EmptyState
					title="No ratio data"
					description="Profitability and valuation ratios will appear here."
				/>
			{/if}
		</SectionCard>
	</div>
</div>
