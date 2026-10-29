<script lang="ts">
	// stock.TerminalShell / TerminalCard (stock_terminal.go). Best effort: an
	// unavailable backend renders nothing. Reads /v1/terminal-positions?ticker=
	// through the /api/v1 proxy.
	import { createQuery } from '@tanstack/svelte-query';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { formatFloat } from '#lib/format.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import { mapTerminalCard, terminalCardBase } from '../lazy-cards.js';
	import type { TerminalCardVM } from '../detail.js';

	let { symbol }: { symbol: string } = $props();

	const query = createQuery(() => ({
		queryKey: ['stock-terminal', symbol],
		queryFn: async (): Promise<TerminalCardVM> => {
			const base = terminalCardBase(symbol);
			if (base.unavailable) return base;
			try {
				const res = await fetch(
					`/api/v1/terminal-positions?ticker=${encodeURIComponent(base.symbol)}`,
					{ headers: { accept: 'application/json' } }
				);
				return mapTerminalCard(base, res.ok ? await res.json() : null);
			} catch {
				return mapTerminalCard(base, null);
			}
		},
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		retry: false
	}));
	const disclaimer = $derived(
		t('Terminal prices are your assumptions, not forecasts. Not financial advice.')
	);
</script>

<div id="stock-terminal">
	{#if query.data && !query.data.unavailable}
		{@const vm = query.data}
		<vigil.Panel class="p-5 md:p-6" titleID="stock-terminal-title">
			<h2 id="stock-terminal-title" class="text-lg font-semibold">Terminal scenario</h2>
			{#if vm.hasScenario}
				{#if vm.scenarioError !== ''}
					<p class="mt-3 text-footnote text-destructive">{vm.scenarioError}</p>
				{:else}
					<dl class="mt-4 grid grid-cols-2 gap-3">
						<div>
							<dt class="command-metric-label">Terminal price</dt>
							<dd class="text-title3 font-semibold tabular-nums">{vm.terminalSharePrice}</dd>
						</div>
						<div>
							<dt class="command-metric-label">Shares needed</dt>
							<dd class="text-title3 font-semibold tabular-nums">{vm.sharesNeeded}</dd>
						</div>
					</dl>
					<div class="mt-3 flex items-center gap-2">
						<div class="h-1 flex-1 overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full bg-primary"
								style={`width:${formatFloat(vm.progressPct, 1)}%`}
							></div>
						</div>
						<span class="text-footnote tabular-nums">{vm.progressLabel}</span>
					</div>
				{/if}
				<a href="/terminal" class="link-tint mt-3 inline-block text-subhead font-semibold"
					>Open terminal sizing</a
				>
			{:else}
				<p class="mt-3 text-subhead text-muted-foreground">
					No terminal scenario for {vm.symbol} yet.
				</p>
				<a href={vm.addHref} class="link-tint mt-3 inline-block text-subhead font-semibold"
					>Add terminal scenario</a
				>
			{/if}
			<p class="mt-3 text-footnote text-muted-foreground">{disclaimer}</p>
		</vigil.Panel>
	{/if}
</div>
