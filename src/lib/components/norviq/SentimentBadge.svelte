<script lang="ts">
	// components.SentimentBadge(vm). Build vm with buildSentimentBadge().
	import { sentimentBadgeClass, sentimentNoDataClass, type SentimentBadgeVM } from './sentiment.js';

	let { vm }: { vm: SentimentBadgeVM } = $props();
</script>

{#if vm.hasReading}
	<span
		class={[
			'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
			sentimentBadgeClass(vm.label)
		]}
		title={vm.tooltip}
	>
		<span>{vm.label}</span>
		<span class="opacity-70">{vm.scoreLabel}</span>
		{#if vm.hasDelta}
			<span class={['text-[10px]', vm.deltaUp ? 'text-emerald-500' : 'text-rose-500']}>
				{vm.deltaLabel}
			</span>
		{/if}
	</span>
{:else}
	<span
		class={['inline-flex items-center rounded-full px-2 py-0.5 text-xs', sentimentNoDataClass()]}
		title={vm.tooltip}
	>
		{vm.label}
	</span>
{/if}
