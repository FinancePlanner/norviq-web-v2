<script lang="ts">
	// components.EmptyState(title, description, actionLabel, actionHref)
	import VigIcon from './VigIcon.svelte';

	let {
		title,
		description,
		actionLabel = '',
		actionHref = ''
	}: { title: string; description: string; actionLabel?: string; actionHref?: string } = $props();
</script>

<div class="empty-state glass-card p-6 md:p-8">
	<div class="empty-state-icon" aria-hidden="true">
		<VigIcon class="empty-state-vig mx-auto" />
	</div>
	<h2 class="empty-state-title">{title}</h2>
	<p class="empty-state-desc">{description}</p>
	{#if actionLabel && actionHref}
		<a href={actionHref} class="btn-primary empty-state-action mt-6 inline-flex w-auto px-6"
			>{actionLabel}</a
		>
	{/if}
</div>
