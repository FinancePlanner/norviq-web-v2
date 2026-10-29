<script lang="ts">
	// dashboard.InvestableCapacityHero + capacityDelta.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { overviewLiquidity } from './overview.js';
	import type { OverviewViewModel } from './types.js';

	let { vm }: { vm: OverviewViewModel } = $props();
	const liquidity = $derived(overviewLiquidity(vm));
	const sentiment = (positive: boolean) => (positive ? 'positive' : 'negative');
</script>

{#snippet delta()}
	{#if vm.portfolioPeriodPercent}
		<vigil.HeroDelta text={vm.portfolioPeriodPercent} sentiment={sentiment(vm.portfolioPeriodPositive)} />
	{:else if vm.ytdPercent}
		<vigil.HeroDelta text={vm.ytdPercent} sentiment={sentiment(vm.ytdPositive)} />
	{/if}
{/snippet}

<vigil.Hero label="Investable capacity" value={vm.totalWealth} {delta}>
	{#if liquidity || vm.spendingThisMonth}
		<vigil.MetricStrip>
			{#if liquidity}
				<vigil.Metric label="Liquid reserve" value={liquidity} />
			{/if}
			{#if vm.spendingThisMonth}
				<vigil.Metric label="Spend this month" value={vm.spendingThisMonth} />
			{/if}
		</vigil.MetricStrip>
	{/if}
	<a href="/expenses" class="link-tint text-subhead font-semibold">Review DCA capacity</a>
</vigil.Hero>
