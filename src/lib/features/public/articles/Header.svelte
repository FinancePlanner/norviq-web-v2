<script lang="ts">
	// articles.templ header()
	import BrandLogo from '#lib/components/norviq/BrandLogo.svelte';
</script>

<header class="mb-10 flex items-center justify-between gap-4">
	<a href="/" class="landing-brand-link" aria-label="Norviq home">
		<BrandLogo variant="full" />
	</a>
	<nav class="flex items-center gap-4 text-sm">
		<a href="/articles" class="hover:underline">Articles</a>
		<a
			href="/articles/new"
			class="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-muted">Write</a
		>
	</nav>
</header>
