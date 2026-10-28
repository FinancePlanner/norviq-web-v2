<script lang="ts">
	// vigil.ListRow(icon, tone, title, subtitle, trailing) — `icon` and `trailing`
	// are snippets (trailing is usually <RowTrailing>); tone colours the icon disc.
	import type { Snippet } from 'svelte';
	import type { Sentiment } from '../types.js';

	let {
		icon,
		tone = '',
		title,
		subtitle = '',
		trailing
	}: { icon?: Snippet; tone?: Sentiment; title: string; subtitle?: string; trailing?: Snippet } = $props();
</script>

<li class="nq-row">
	{#if icon}
		<span class={['nq-row-icon', tone === 'positive' && 'is-positive', tone === 'negative' && 'is-negative']} aria-hidden="true">
			{@render icon()}
		</span>
	{/if}
	<div class="nq-row-body">
		<p class="nq-row-title">{title}</p>
		{#if subtitle}
			<p class="nq-row-subtitle">{subtitle}</p>
		{/if}
	</div>
	{#if trailing}
		<div class="nq-row-trailing">
			{@render trailing()}
		</div>
	{/if}
</li>
