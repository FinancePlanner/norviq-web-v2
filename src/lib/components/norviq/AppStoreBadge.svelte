<script lang="ts">
	// components.AppStoreBadge(href): empty → muted "Coming soon"; TestFlight URL
	// → link captioned "Beta · TestFlight"; else a plain store link.
	let { href = '' }: { href?: string | null } = $props();
	const isTestFlight = $derived(!!href && href.includes('testflight.apple.com'));
</script>

{#snippet art()}
	<img
		src="/static/images/badges/download-on-the-app-store.svg"
		alt=""
		width="120"
		height="40"
		class="store-badge-img store-badge-on-light"
	/>
	<img
		src="/static/images/badges/download-on-the-app-store-white.svg"
		alt=""
		width="120"
		height="40"
		class="store-badge-img store-badge-on-dark"
	/>
{/snippet}

<div class="store-badge-slot">
	{#if !href}
		<span
			class="store-badge store-badge-apple store-badge-soon"
			role="img"
			aria-label="App Store — coming soon"
		>
			{@render art()}
		</span>
		<span class="store-badge-caption" aria-hidden="true">Coming soon</span>
	{:else if isTestFlight}
		<a
			{href}
			class="store-badge store-badge-apple"
			rel="noopener noreferrer"
			target="_blank"
			aria-label="Download on the App Store — beta on TestFlight"
		>
			{@render art()}
		</a>
		<span class="store-badge-caption" aria-hidden="true">Beta · TestFlight</span>
	{:else}
		<a
			{href}
			class="store-badge store-badge-apple"
			rel="noopener noreferrer"
			target="_blank"
			aria-label="Download on the App Store"
		>
			{@render art()}
		</a>
	{/if}
</div>
