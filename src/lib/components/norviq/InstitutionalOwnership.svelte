<script lang="ts">
	// components.InstitutionalOwnership(vm) — no-op when !vm.present.
	import { institutionalSummaryLabel, type InstitutionalVM } from './market-signals.js';

	let { vm }: { vm: InstitutionalVM } = $props();
</script>

{#if vm.present}
	<div data-market-signal="institutional">
		<p class="text-sm text-muted-foreground">{institutionalSummaryLabel(vm)}</p>
		{#if vm.holders.length > 0}
			<table class="mt-4 w-full text-left text-sm">
				<thead class="text-muted-foreground">
					<tr>
						<th scope="col" class="py-2 font-medium">Holder</th>
						<th scope="col" class="py-2 text-right font-medium">Shares</th>
						<th scope="col" class="py-2 text-right font-medium">Change</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.holders as holder, i (i)}
						<tr class="border-t">
							<td class="py-2">{holder.name}</td>
							<td class="py-2 text-right tabular-nums">{holder.shares}</td>
							<td class={['py-2 text-right tabular-nums', holder.changeTone]}>{holder.change}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
{/if}
