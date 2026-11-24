<script lang="ts">
	// dashboard.InvestableCapacityHero + capacityDelta. The figure is the market
	// value of the user's holdings, cash excluded (/v1/dashboard totalMarketValue),
	// the same number as the Holdings metric on /portfolio, and labelled as such.
	// DS 2.0 P1: in the account currency, and the change is measured over the
	// fetched range with its basis, hidden when the history is stale.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import { overviewLiquidity } from './overview.js';
	import type { OverviewViewModel } from './types.js';

	let { vm }: { vm: OverviewViewModel } = $props();
	const liquidity = $derived(overviewLiquidity(vm));
	const sentiment = (positive: boolean) => (positive ? 'positive' : 'negative');
</script>

{#snippet delta()}
	{#if vm.delta}
		<vigil.HeroDelta
			text={`${vm.delta.text} ${vm.delta.basis}`}
			sentiment={sentiment(vm.delta.positive)}
		/>
	{/if}
{/snippet}

<vigil.Hero label={t('Holdings value')} value={vm.totalWealth} {delta}>
	{#if vm.asOfCaption}
		<p class="text-caption text-muted-foreground">{vm.asOfCaption}</p>
	{/if}
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
