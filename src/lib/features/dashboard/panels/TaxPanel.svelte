<script lang="ts">
	// dashboard.TaxPanelShell / TaxPanel. `vm` undefined = still loading (shell).
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import SkeletonBlock from '#lib/components/norviq/SkeletonBlock.svelte';
	import type { TaxPanelVM } from './types.js';

	let { vm }: { vm?: TaxPanelVM } = $props();
</script>

{#if !vm}
	<div id="cc-tax-panel">
		<vigil.Panel class="cc-tax-panel-inner">
			<div class="cc-panel-head">
				<div class="cc-panel-head-copy">
					<h2 class="cc-panel-title">Harvestable this year</h2>
				</div>
			</div>
			<SkeletonBlock heightClass="h-24" />
		</vigil.Panel>
	</div>
{:else}
	<div id="cc-tax-panel">
		<vigil.Panel class="cc-tax-panel-inner" titleID="cc-tax-title">
			<div class="cc-panel-head">
				<div class="cc-panel-head-copy">
					<h2 id="cc-tax-title" class="cc-panel-title">
						Harvestable
						{#if vm.taxYear}{' · ' + vm.taxYear}{/if}
					</h2>
				</div>
				<a class="cc-panel-link" href={vm.href}>Open tax</a>
			</div>
			{#if vm.unavailable}
				<p class="cc-panel-note">Tax data is unavailable right now.</p>
			{:else if vm.needsProfile}
				<p class="cc-panel-note">Complete your tax profile to see harvesting opportunities.</p>
			{:else}
				<dl class="cc-tax-figures">
					<div>
						<dt>Harvestable losses</dt>
						<dd>{vm.harvestableLosses}</dd>
					</div>
					<div>
						<dt>Estimated benefit</dt>
						<dd>{vm.estimatedBenefit}</dd>
					</div>
				</dl>
				{#if vm.isStale}
					<p class="cc-panel-note">Prices are stale — figures may have moved.</p>
				{/if}
				{#if vm.opportunities.length > 0}
					<ul class="cc-tax-list">
						{#each vm.opportunities as opp, i (i)}
							<li class="cc-tax-row">
								<span class="cc-tax-symbol">{opp.symbol}</span>
								<span class="cc-tax-loss">{opp.unrealizedLoss}</span>
								<span class="cc-tax-benefit">{opp.benefit}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="cc-panel-note">No open harvesting opportunities.</p>
				{/if}
			{/if}
		</vigil.Panel>
	</div>
{/if}
