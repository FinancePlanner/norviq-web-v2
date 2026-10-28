<script lang="ts">
	// components.TechnicalsStrip(vm) — no-op when !vm.present.
	import { barOffset, type TechnicalsVM } from './market-signals.js';

	let { vm }: { vm: TechnicalsVM } = $props();
</script>

{#if vm.present}
	<div class="market-technicals-strip flex flex-wrap items-center gap-2 text-sm" data-market-signal="technicals">
		{#if vm.trendLabel}
			<span class="rounded-full border px-3 py-1">{vm.trendLabel}</span>
		{/if}
		{#if vm.crossLabel}
			<span class={['rounded-full border px-3 py-1 font-semibold', vm.crossTone]}>{vm.crossLabel}</span>
		{/if}
		{#if vm.hasRSI}
			<span class="rounded-full border px-3 py-1 tabular-nums">
				RSI {vm.rsi}
				{#if vm.rsiHint}
					<span class={['ml-1 font-semibold', vm.rsiTone]}>{vm.rsiHint}</span>
				{/if}
			</span>
		{/if}
		{#if vm.hasMACD}
			<span class={['rounded-full border px-3 py-1', vm.macdTone]}>MACD {vm.macdLabel}</span>
		{/if}
		{#if vm.has52Week}
			<span class="market-technicals-band flex min-w-[12rem] flex-1 items-center gap-2">
				<span class="text-xs tabular-nums text-muted-foreground">{vm.low52}</span>
				<span
					class="relative h-1.5 flex-1 rounded-full bg-muted"
					role="img"
					aria-label={vm.position52Label}
					title={vm.position52Label}
				>
					<span
						class="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
						style={barOffset(vm.position52Pct ?? 0)}
					></span>
				</span>
				<span class="text-xs tabular-nums text-muted-foreground">{vm.high52}</span>
			</span>
		{/if}
		{#if vm.asOf}
			<span class="text-xs text-muted-foreground">as of {vm.asOf}</span>
		{/if}
	</div>
{/if}
