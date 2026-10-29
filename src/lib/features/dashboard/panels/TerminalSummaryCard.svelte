<script lang="ts">
	// dashboard.TerminalSummaryShell / TerminalSummaryCard. `vm` undefined = shell.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import SkeletonBlock from '#lib/components/norviq/SkeletonBlock.svelte';
	import SecondaryButton from '#lib/components/norviq/SecondaryButton.svelte';
	import { formatFloat } from '#lib/format.js';
	import type { TerminalSummaryVM } from './types.js';

	let { vm }: { vm?: TerminalSummaryVM } = $props();
</script>

{#snippet openLink()}<a href="/terminal">Open</a>{/snippet}

{#if !vm}
	<div id="cc-terminal-summary">
		<vigil.Panel class="cc-terminal-summary-inner">
			<div class="cc-panel-head">
				<div class="cc-panel-head-copy">
					<h2 class="cc-panel-title">Terminal sizing</h2>
				</div>
			</div>
			<SkeletonBlock heightClass="h-20" />
		</vigil.Panel>
	</div>
{:else if vm.loadError}
	<div id="cc-terminal-summary" hidden></div>
{:else}
	<div id="cc-terminal-summary">
		<vigil.Panel class="cc-terminal-summary-inner" titleID="cc-terminal-title">
			<vigil.PanelHeader id="cc-terminal-title" title="Terminal sizing" trailing={openLink} />
			{#if vm.empty}
				{#if vm.monthlyAutobuyTotal}
					<div class="mb-3">
						<p class="command-metric-label">Autobuys a month</p>
						<p class="text-title3 font-semibold tabular-nums">{vm.monthlyAutobuyTotal}</p>
					</div>
				{/if}
				<p class="text-subhead text-muted-foreground">Pick a future market cap and share count, and see how many shares your target takes.</p>
				<div class="mt-3">
					<SecondaryButton href="/terminal">Plan a position</SecondaryButton>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-3">
					<div>
						<p class="command-metric-label">Value wanted</p>
						<p class="text-title3 font-semibold tabular-nums">{vm.totalValueWanted}</p>
					</div>
					<div>
						<p class="command-metric-label">Autobuys a month</p>
						<p class="text-title3 font-semibold tabular-nums">{vm.monthlyAutobuyTotal}</p>
					</div>
				</div>
				<ul class="mt-3 space-y-2">
					{#each vm.top as row, i (i)}
						<li class="space-y-1">
							<div class="flex justify-between gap-2 text-subhead">
								<span class="font-semibold">{row.ticker}</span>
								<span class="tabular-nums text-muted-foreground">{row.sharesNeeded} shares at {row.terminalSharePrice}</span>
							</div>
							<div class="flex items-center gap-2">
								<div class="h-1 flex-1 overflow-hidden rounded-full bg-muted">
									<div class="h-full rounded-full bg-primary" style={`width:${formatFloat(row.progressPct, 1)}%`}></div>
								</div>
								<span class="text-footnote tabular-nums">{row.progressLabel}</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
			<p class="mt-3 text-footnote text-muted-foreground">{vm.disclaimer}</p>
		</vigil.Panel>
	</div>
{/if}
