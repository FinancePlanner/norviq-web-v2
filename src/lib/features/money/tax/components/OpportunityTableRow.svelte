<script lang="ts">
	// tax.opportunityTableRow. The dismiss/restore buttons submit the enclosing
	// scenario form to /tax?/dismiss|restore&id=… (Go: formaction /tax/opportunities/{id}/dismiss|restore).
	import { CheckboxField, NativeButton, SelectField } from '#lib/components/norviq/index.js';
	import { money, replacementOptions } from '../helpers.js';
	import type { TaxOpportunityResponse } from '../types.js';

	let { item }: { item: TaxOpportunityResponse } = $props();
</script>

<tr class="border-b border-current/5">
	<td class="py-3">
		<CheckboxField name="opportunityId" value={item.id} disabled={item.status !== 'actionable'} aria-label={'Select ' + item.symbol} />
	</td>
	<td class="py-3 font-semibold">{item.symbol}</td>
	<td class="py-3 text-sm text-muted-foreground">{item.instrumentType}</td>
	<td class="py-3 text-sm text-muted-foreground">{item.holdingPeriod}</td>
	<td class="py-3"><span class="rounded-full border border-current/10 px-2 py-0.5 text-xs">{item.status}</span></td>
	<td class="py-3 tabular-nums">{money(item.unrealizedLoss)}</td>
	<td class="py-3 tabular-nums">{money(item.estimatedTaxBenefit)}</td>
	<td class="py-3">
		{#if item.replacementCandidates && item.replacementCandidates.length > 0}
			<SelectField name={'replacement_' + item.id} required class="text-xs" options={replacementOptions(item, false)} />
		{:else}
			<span class="text-xs opacity-40">—</span>
		{/if}
	</td>
	<td class="py-3 text-right">
		{#if item.status === 'dismissed'}
			<NativeButton type="submit" class="btn-secondary text-xs" formaction="/tax?/restore&id={item.id}" formmethod="post" formnovalidate>
				Restore
			</NativeButton>
		{:else if item.status === 'actionable' || item.status === 'watch'}
			<NativeButton type="submit" class="btn-secondary text-xs" formaction="/tax?/dismiss&id={item.id}" formmethod="post" formnovalidate>
				Dismiss
			</NativeButton>
		{/if}
	</td>
</tr>
