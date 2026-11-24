<script lang="ts">
	// templates.PublicLayout (norviq-web templates/public.templ): no app shell,
	// just the mesh background behind the page body. Title, meta tags, OG/JSON-LD
	// and any page-only stylesheet come from each page (<svelte:head>). The PWA
	// head meta below is PwaHeadMeta; app.html already has the viewport, icons
	// and manifest. Like Go, the public layout never registers the service
	// worker (the root layout skips it for the (public) group).
	import { page } from '$app/state';

	let { children } = $props();
	// Only the brief sets the display face (Brygada 1918) in the public group;
	// the landing and legal pages never fetch it.
	const displayFace = $derived(page.route.id?.startsWith('/(public)/brief') ?? false);
</script>

<svelte:head>
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Norviq" />
	{#if displayFace}
		<link
			rel="preload"
			href="/static/fonts/brygada-1918-latin-wght-normal.woff2"
			as="font"
			type="font/woff2"
			crossorigin="anonymous"
		/>
	{/if}
</svelte:head>

<div class="mesh-bg fixed inset-0 -z-10" aria-hidden="true"></div>
{@render children()}
