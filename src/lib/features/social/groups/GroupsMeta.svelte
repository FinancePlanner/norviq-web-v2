<script lang="ts">
	// groups.templ MetaTags plus the renderShell title.
	let { title }: { title: string } = $props();
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content="Chat groups with friends about the stocks, ETFs and topics you follow." />
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>
