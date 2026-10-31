<script lang="ts">
	// pages/public nav(): the landing chrome trimmed to what an unauthenticated
	// visitor needs. Shared by /s, /p, /i and /g (same templ package in Go).
	import BrandLogo from '#lib/components/norviq/BrandLogo.svelte';
	import PrimaryButton from '#lib/components/norviq/PrimaryButton.svelte';
</script>

<header class="public-stock-nav mb-10 flex items-center justify-between gap-4">
	<a href="/" class="landing-brand-link" aria-label="Norviq home">
		<BrandLogo variant="full" />
	</a>
	<div class="flex items-center gap-2">
		<a
			href="/login"
			class="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground sm:px-4"
			>Log in</a
		>
		<PrimaryButton href="/signup" class="px-4 py-2 text-sm sm:px-5">Sign up</PrimaryButton>
	</div>
</header>
