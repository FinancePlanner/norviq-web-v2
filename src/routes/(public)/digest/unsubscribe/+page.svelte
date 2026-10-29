<script lang="ts">
	// public.DigestUnsubscribeMetaTags + DigestUnsubscribePage
	// (internal/pages/public/digest_unsubscribe.templ).
	import { enhance } from '$app/forms';
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import { withSpinner } from '#lib/components/norviq/form-loading.js';
	import PublicNav from '#lib/features/public/stock/PublicNav.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const done = $derived(form?.done === true);
	const token = $derived(form?.token || data.token);
</script>

<svelte:head>
	<title>Weekly digest email</title>
	<meta name="robots" content="noindex,nofollow" />
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<main id="main-content" class="mx-auto w-full max-w-xl px-6 py-10">
	<PublicNav />
	<section class="mt-8 rounded-[var(--radius)] border bg-card-bg p-6 text-center" data-digest-unsubscribe>
		{#if done}
			<h1 class="text-xl font-semibold">You're unsubscribed</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				You won't get the weekly digest email any more. You can turn it back on in Settings › Notifications.
			</p>
		{:else}
			<h1 class="text-xl font-semibold">Stop the weekly digest email?</h1>
			<p class="mt-2 text-sm text-muted-foreground">Push and Telegram digests, if you have them, are not affected.</p>
			{#if form?.error}
				<div class="mt-6">
					<FormErrorBanner message={form.error} />
				</div>
			{/if}
			<form method="post" action="/digest/unsubscribe" class="mt-6" use:enhance={withSpinner()}>
				<input type="hidden" name="token" value={token} />
				<SubmitButton fullWidth>Unsubscribe</SubmitButton>
			</form>
		{/if}
	</section>
</main>
