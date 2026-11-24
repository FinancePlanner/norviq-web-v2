<script lang="ts">
	// templates.PublicLayout (norviq-web templates/public.templ): no app shell,
	// just the mesh background behind the page body. Title, meta tags, OG/JSON-LD
	// and any page-only stylesheet come from each page (<svelte:head>). The PWA
	// head meta below is PwaHeadMeta; app.html already has the viewport, icons
	// and manifest. Like Go, the public layout never registers the service
	// worker (the root layout skips it for the (public) group).
	let { children } = $props();
</script>

<svelte:head>
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Norviq" />
</svelte:head>

<div class="mesh-bg fixed inset-0 -z-10" aria-hidden="true"></div>
{@render children()}
