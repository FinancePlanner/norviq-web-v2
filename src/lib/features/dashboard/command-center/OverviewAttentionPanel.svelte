<script lang="ts">
	// dashboard.OverviewAttentionPanel: only the warning and setup states.
	import { overviewAttention } from './overview.js';
	import type { OverviewViewModel } from './types.js';

	let { vm }: { vm: OverviewViewModel } = $props();
	const attention = $derived(overviewAttention(vm));
</script>

{#if attention.show && (attention.tone === 'warning' || attention.tone === 'setup')}
	<section
		class={'overview-subheader overview-subheader-' + attention.tone + ' overview-hero-status'}
	>
		<div class="overview-subheader-main">
			<div class="overview-subheader-metric-row">
				<h2 class="overview-subheader-title">{attention.title}</h2>
				{#if attention.metricPositive !== null}
					<span
						class={'overview-change-pill ' +
							(attention.metricPositive ? 'overview-change-positive' : 'overview-change-negative')}
						data-direction={attention.metricPositive ? 'up' : 'down'}>{attention.description}</span
					>
					{#if attention.metricSuffix}
						<span class="overview-subheader-metric-suffix">{attention.metricSuffix}</span>
					{/if}
				{:else if attention.description}
					<p class="overview-subheader-copy">{attention.description}</p>
				{/if}
			</div>
			{#if attention.secondary}
				<p class="overview-subheader-guidance">{attention.secondary}</p>
			{/if}
		</div>
		{#if attention.actionHref}
			<a href={attention.actionHref} class="instrument-action overview-hero-primary shrink-0"
				>{attention.actionLabel}</a
			>
		{/if}
	</section>
{/if}
