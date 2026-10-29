<script lang="ts">
	// stock.OwnershipTab — the public ticker page's cards, asked for more rows.
	import {
		CongressTrades,
		EmptyState,
		InsiderActivity,
		InstitutionalOwnership,
		SectionCard
	} from '#lib/components/norviq/index.js';
	import type { OwnershipTabVM } from '../detail.js';

	let { vm }: { vm: OwnershipTabVM } = $props();
</script>

<div class="stock-ownership-tab mt-6 space-y-4">
	{#if vm.insider.present}
		<SectionCard title="Insider activity"><InsiderActivity vm={vm.insider} /></SectionCard>
	{/if}
	{#if vm.institutional.present}
		<SectionCard title="Institutional ownership"
			><InstitutionalOwnership vm={vm.institutional} /></SectionCard
		>
	{/if}
	{#if vm.congress.present}
		<SectionCard title="Congressional trades"><CongressTrades vm={vm.congress} /></SectionCard>
	{/if}
	{#if !vm.hasData}
		<EmptyState
			title="No ownership filings"
			description="Insider filings, 13F holders and congressional disclosures will appear here once they are published for this symbol."
		/>
	{/if}
</div>
