<script lang="ts">
	// components.StoreBadges(appStoreURL, googlePlayURL)
	import AppStoreBadge from './AppStoreBadge.svelte';
	import GooglePlayBadge from './GooglePlayBadge.svelte';

	let { appStoreURL = '', googlePlayURL = '' }: { appStoreURL?: string | null; googlePlayURL?: string | null } = $props();
</script>

<div class="landing-store-badges">
	<AppStoreBadge href={appStoreURL} />
	<GooglePlayBadge href={googlePlayURL} />
</div>
