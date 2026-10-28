<script lang="ts">
	// components.EmptyStateInline(title, description, actionLabel, actionHref) —
	// the nested-panel empty: type only, no second card.
	let {
		title,
		description = '',
		actionLabel = '',
		actionHref = ''
	}: { title: string; description?: string; actionLabel?: string; actionHref?: string } = $props();
</script>

<div class="empty-state-inline">
	<p class="empty-state-inline-title">{title}</p>
	{#if description}
		<p class="empty-state-inline-desc">{description}</p>
	{/if}
	{#if actionLabel && actionHref}
		<a href={actionHref} class="empty-state-inline-action">{actionLabel}</a>
	{/if}
</div>
