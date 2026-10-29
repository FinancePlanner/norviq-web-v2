<script lang="ts">
	// stock.PressureShell / PressureCard / PressureUnavailable. Go lazy-loaded
	// GET /portfolio/{symbol}/pressure on load; this reads the one backend
	// call it wrapped through the /api/v1 proxy.
	import { createQuery } from '@tanstack/svelte-query';
	import { SkeletonBlock } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { formatFloat } from '#lib/format.js';
	import type { components } from '#lib/api/schema.js';
	import { mapPressure, pressureBarClass, pressureChipClass, signedPct2 } from '../lazy-cards.js';
	import type { PressureVM } from '../detail.js';

	let { symbol }: { symbol: string } = $props();

	const query = createQuery(() => ({
		queryKey: ['stock-pressure', symbol],
		queryFn: async (): Promise<PressureVM | null> => {
			const sym = symbol.trim().toUpperCase();
			if (sym === '') return null;
			try {
				const res = await fetch(`/api/v1/market/pressure/${encodeURIComponent(sym)}`, {
					headers: { accept: 'application/json' }
				});
				if (!res.ok) return null;
				return mapPressure((await res.json()) as components['schemas']['MarketPressureResponse']);
			} catch {
				return null;
			}
		},
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		retry: false
	}));
</script>

<div id="stock-pressure">
	{#if query.isPending}
		<section class="glass-card p-5 md:p-6" aria-hidden="true">
			<h2 class="text-lg font-semibold">Trading pressure</h2>
			<div class="mt-4 space-y-3">
				<SkeletonBlock heightClass="h-8 rounded-xl" />
				<SkeletonBlock heightClass="h-24 rounded-xl" />
			</div>
		</section>
	{:else if query.data}
		{@const vm = query.data}
		<vigil.Panel class="p-5 md:p-6" titleID="pressure-title">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 id="pressure-title" class="text-lg font-semibold">Trading pressure</h2>
				<span class={['pressure-chip', pressureChipClass(vm.temperature)]}>{vm.label}</span>
			</div>

			<div class="mt-5 flex items-center gap-4">
				<p class="pressure-reading tabular-nums">
					{formatFloat(vm.temperature, 0)}<span class="pressure-reading-scale">/100</span>
				</p>
				<div class="min-w-0 flex-1">
					<div
						class="pressure-track"
						role="img"
						aria-label={`Pressure temperature ${formatFloat(vm.temperature, 0)} of 100, ${vm.label}`}
					>
						<span class="pressure-track-midtick" aria-hidden="true"></span>
						<span
							class="pressure-marker"
							style={`left:${formatFloat(vm.temperature, 1)}%`}
							aria-hidden="true"
						></span>
					</div>
					<div class="mt-1 flex justify-between text-footnote font-semibold text-muted-foreground">
						<span>Selling</span><span>Balanced</span><span>Buying</span>
					</div>
				</div>
			</div>

			<div class="mt-5 grid grid-cols-3 gap-3 text-sm">
				<div class="rounded-lg bg-current/5 px-3 py-3">
					<p class="text-xs text-muted-foreground">Rel. volume</p>
					<p
						class={[
							'mt-1 font-semibold tabular-nums',
							vm.relative >= 1.5 && 'text-[var(--color-tint)]'
						]}
					>
						{formatFloat(vm.relative, 2)}×
					</p>
				</div>
				<div class="rounded-lg bg-current/5 px-3 py-3">
					<p class="text-xs text-muted-foreground">Today / 30d avg</p>
					<p class="mt-1 font-semibold tabular-nums">{vm.todayVolume} / {vm.avgVolume}</p>
				</div>
				<div class="rounded-lg bg-current/5 px-3 py-3">
					<p class="text-xs text-muted-foreground">Day move</p>
					<p
						class={[
							'mt-1 font-semibold tabular-nums',
							vm.changePct >= 0 && 'text-[var(--color-success,#089981)]',
							vm.changePct < 0 && 'text-[var(--color-danger)]'
						]}
					>
						{signedPct2(vm.changePct)}
					</p>
				</div>
			</div>

			{#if vm.history.length > 0}
				<div class="mt-5">
					<p class="text-footnote font-semibold text-muted-foreground">
						Volume vs 30-session average
					</p>
					<div class="pressure-bars mt-2" role="img" aria-label="Relative volume, last 30 sessions">
						{#each vm.history as bar, i (i)}
							<span
								class={['pressure-bar', pressureBarClass(bar.relative)]}
								style={`height:${bar.heightPct}%`}
								title={`${bar.date} · ${formatFloat(bar.relative, 2)}× average`}
							></span>
						{/each}
					</div>
					<div class="pressure-baseline" aria-hidden="true"></div>
				</div>
			{/if}

			{#if vm.insider}
				{@const insider = vm.insider}
				<div class="mt-5 border-t border-current/10 pt-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<p class="text-footnote font-semibold text-muted-foreground">
							Insider activity · last {insider.windowDays} days
						</p>
						<span
							class={[
								'pressure-chip',
								insider.netSelling && 'pressure-chip-cold',
								!insider.netSelling && 'pressure-chip-hot'
							]}
						>
							{#if insider.netSelling}net selling {insider.netShares}{:else}net buying {insider.netShares}{/if}
						</span>
					</div>
					<p class="mt-1 text-sm text-muted-foreground">
						{insider.buys} buys · {insider.sells} sells
					</p>
					{#if insider.notable.length > 0}
						<ul class="mt-3 space-y-2" role="list">
							{#each insider.notable as trade, i (i)}
								<li class="flex items-center gap-3 text-sm">
									<span
										class={[
											'pressure-side-dot',
											trade.side === 'buy' && 'pressure-side-buy',
											trade.side !== 'buy' && 'pressure-side-sell'
										]}
										aria-hidden="true"
									></span>
									<span class="min-w-0 flex-1 truncate">
										{trade.name}
										{#if trade.role !== ''}<span class="opacity-55">· {trade.role}</span>{/if}
									</span>
									<span class="tabular-nums opacity-75">{trade.shares} sh</span>
									<span class="text-xs text-muted-foreground">{trade.date}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
			{#if vm.asOf !== ''}
				<p class="mt-4 text-[11px] opacity-45">As of {vm.asOf}</p>
			{/if}
		</vigil.Panel>
	{:else}
		<vigil.Panel class="p-5 md:p-6">
			<h2 class="text-lg font-semibold">Trading pressure</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				Pressure data is unavailable for this symbol right now.
			</p>
		</vigil.Panel>
	{/if}
</div>
