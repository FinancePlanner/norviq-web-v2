<script lang="ts">
	// dashboard.InvestableCapacityHero + capacityDelta. The figure is the market
	// value of the user's holdings, cash excluded (/v1/dashboard totalMarketValue),
	// the same number as the Holdings metric on /portfolio, and labelled as such.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { overviewLiquidity } from './overview.js';
	import type { OverviewViewModel } from './types.js';

	let { vm }: { vm: OverviewViewModel } = $props();
	const liquidity = $derived(overviewLiquidity(vm));
	const sentiment = (positive: boolean) => (positive ? 'positive' : 'negative');
</script>

{#snippet delta()}
	{#if vm.portfolioPeriodPercent}
		<vigil.HeroDelta
			text={vm.portfolioPeriodPercent}
			sentiment={sentiment(vm.portfolioPeriodPositive)}
		/>
	{:else if vm.ytdPercent}
		<vigil.HeroDelta text={vm.ytdPercent} sentiment={sentiment(vm.ytdPositive)} />
	{/if}
{/snippet}

<vigil.Hero label="Holdings value" value={vm.totalWealth} {delta}>
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
	<a href="/expenses" class="link-tint text-subhead font-semibold">Plan monthly surplus</a>
</vigil.Hero>
