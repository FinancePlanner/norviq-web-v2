<script lang="ts">
	// dashboard.FinancialHealthCard(health): score gauge + status summary.
	import { t } from '#lib/i18n/context.svelte.js';
	import { formatFloat } from '#lib/format.js';
	import Panel from '#lib/components/norviq/vigil/Panel.svelte';
	import PanelHeader from '#lib/components/norviq/vigil/PanelHeader.svelte';
	import type { FinancialHealthVM } from '../types.js';

	let { health }: { health: FinancialHealthVM } = $props();

	// healthGaugeStyle: the gauge is a half circle, so 100% is 180deg.
	const gaugeStyle = $derived(`--health-gauge-angle: ${formatFloat(Math.min(100, Math.max(0, health.ringPercent)) * 1.8, 1)}deg;`);
</script>

<Panel class="financial-health-panel" titleID="financial-health-title">
	<PanelHeader id="financial-health-title" title={t('Financial health')}>
		{#snippet trailing()}<a href="/dashboard/insights">{t('Details')}</a>{/snippet}
	</PanelHeader>
	<div class="financial-health-card">
		<div class={'health-gauge health-ring-' + health.tone} style={gaugeStyle} aria-label={health.scoreText + ' out of 100'}>
			<div class="health-gauge-arc" aria-hidden="true"></div>
			<div class="health-ring-inner">
				<span class="health-ring-score">{health.scoreText}</span>
			</div>
		</div>
		<div class="financial-health-copy">
			<p class={'financial-health-summary financial-health-summary-' + health.tone}>
				{#if health.summaryText}
					<span>{health.summaryText}</span>
				{/if}
			</p>
			<p class="financial-health-label">{t('Score out of 100')}</p>
		</div>
	</div>
</Panel>
