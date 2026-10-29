<script lang="ts">
	// templates.OnboardingLayout: topbar (logo + log out), progress bar when
	// step > 0, then the page. <meta name="robots" content="noindex"> is
	// onboarding.MetaTags(); the <title> comes from each page.
	import type { Snippet } from 'svelte';
	import BrandLogo from '#lib/components/norviq/BrandLogo.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import ProgressBar from './ProgressBar.svelte';

	let { step = 0, children }: { step?: number; children?: Snippet } = $props();

	// <body class="onboarding-body">
	$effect(() => {
		document.body.classList.add('onboarding-body');
		return () => document.body.classList.remove('onboarding-body');
	});
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mesh-bg fixed inset-0 -z-10" aria-hidden="true"></div>
<div class="onboarding-shell">
	<header class="onboarding-topbar">
		<a href="/dashboard" class="flex items-center gap-2" aria-label="Norviq">
			<BrandLogo variant="icon" />
		</a>
		<form method="POST" action="/logout">
			<NativeButton type="submit" class="app-logout-btn text-sm">Log out</NativeButton>
		</form>
	</header>
	<div id="main-content" class="onboarding-content mx-auto w-full max-w-3xl px-4 py-8">
		{#if step > 0}
			<ProgressBar activeStep={step} />
		{/if}
		<div class="mt-8">
			{@render children?.()}
		</div>
	</div>
</div>
