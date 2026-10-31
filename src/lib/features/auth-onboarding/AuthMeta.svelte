<script lang="ts">
	// templates.AuthLayout <title> + auth.MetaTags(keywords, description).
	let { title, keywords, description }: { title: string; keywords: string; description: string } =
		$props();
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="keywords" content={keywords} />
	<meta name="description" content={description} />
</svelte:head>
