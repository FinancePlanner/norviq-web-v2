<script lang="ts">
	// components.GooglePlayBadge(href): empty → muted "Coming soon", else a link.
	let { href = '' }: { href?: string | null } = $props();
</script>

{#snippet art()}
	<img src="/static/images/badges/google-play-badge.png" alt="" width="155" height="60" class="store-badge-img" />
{/snippet}

<div class="store-badge-slot">
	{#if !href}
		<span class="store-badge store-badge-play store-badge-soon" role="img" aria-label="Google Play — coming soon">
			{@render art()}
		</span>
		<span class="store-badge-caption" aria-hidden="true">Coming soon</span>
	{:else}
		<a {href} class="store-badge store-badge-play" rel="noopener noreferrer" target="_blank" aria-label="Get it on Google Play">
			{@render art()}
		</a>
	{/if}
</div>
