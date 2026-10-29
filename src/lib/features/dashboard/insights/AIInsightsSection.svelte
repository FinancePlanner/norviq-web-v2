<script lang="ts">
	// dashboard.AIInsightsSection(isPro) + AIInsightsGridShell + AIInsightsGrid
	// + AIInsightCard. `ai` is the page load's streamed /dashboard/insights/ai
	// result; null (no Pro / feature unavailable) leaves the shell's loading
	// line in place, which is what Go's refused hx-get left behind.
	import { t } from '#lib/i18n/context.svelte.js';
	import AIConsentCard from '#lib/components/norviq/AIConsentCard.svelte';
	import ProGateWrap from '#lib/components/norviq/ProGateWrap.svelte';
	import CommandDeck from '#lib/components/norviq/vigil/CommandDeck.svelte';
	import Panel from '#lib/components/norviq/vigil/Panel.svelte';
	import type { AIInsightsResult } from '../types.js';

	let { isPro, ai }: { isPro: boolean; ai: Promise<AIInsightsResult> | null } = $props();
</script>

{#snippet loading()}
	<p class="ai-console-loading">{t('Loading insights…')}</p>
{/snippet}

{#snippet gridShell()}
	<div id="ai-insights-grid" class="ai-insights-grid">
		{#if ai}
			{#await ai}
				{@render loading()}
			{:then result}
				{#if result.consentRequired}
					<AIConsentCard next={result.next} dismissible />
				{:else if result.cards.length === 0}
					<p class="ai-console-loading">{t('No insights yet. They appear once you have holdings or expenses recorded.')}</p>
				{:else}
					<CommandDeck class="is-2col mt-2">
						{#each result.cards as card, i (i)}
							<article class="ai-insight-card glass-card p-5">
								{#if card.error}
									<p class="text-sm text-danger">{t(card.error)}</p>
								{:else}
									<p class="command-metric-label">{t(card.kindLabel)}</p>
									<h3 class="mt-2 text-lg font-semibold">{card.title}</h3>
									<p class="mt-3 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
									{#if card.highlights.length > 0}
										<ul class="mt-4 space-y-2">
											{#each card.highlights as h, j (j)}
												<li class="flex items-baseline justify-between gap-3 text-sm">
													<span class="opacity-70">{h.label}</span>
													<span class="font-semibold tabular-nums">{h.value}</span>
												</li>
											{/each}
										</ul>
									{/if}
									{#if card.disclaimer}
										<p class="mt-4 text-xs text-muted-foreground">{card.disclaimer}</p>
									{/if}
								{/if}
							</article>
						{/each}
					</CommandDeck>
				{/if}
			{:catch}
				{@render loading()}
			{/await}
		{:else}
			{@render loading()}
		{/if}
	</div>
{/snippet}

<Panel class="ai-insights-section ai-console-panel mt-8 rounded-lg p-6" titleID="ai-insights-heading">
	<div class="ai-console-header">
		<div>
			<h2 id="ai-insights-heading" class="text-xl font-semibold">{t('Educational insights')}</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				{t('Plain-language takeaways from your portfolio and spending - not financial advice.')}
			</p>
		</div>
	</div>
	<div class="mt-5">
		{#if !isPro}
			<ProGateWrap {isPro} featureName="AI insights">{@render gridShell()}</ProGateWrap>
		{:else}
			{@render gridShell()}
		{/if}
	</div>
</Panel>
