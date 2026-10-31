<script lang="ts">
	// pages/public/invite.templ (InviteMetaTags + InvitePage). Accept posts to
	// /friends/invite/{code}/accept (owned by the friends domain), like Go.
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import PublicNav from '#lib/features/public/stock/PublicNav.svelte';
	import { socialUserTitle } from '#lib/features/public/invite/types.js';

	let { data } = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head>
	<title>Join me on Norviq</title>
	<meta name="description" content="You've been invited to connect on Norviq." />
	<meta name="robots" content="noindex,nofollow" />
	<meta name="referrer" content="no-referrer" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Norviq" />
	<meta property="og:url" content={vm.canonicalURL} />
	<meta property="og:title" content="Join me on Norviq" />
	<meta
		property="og:description"
		content="Track your portfolio, keep a streak and compare progress with friends."
	/>
	<meta property="og:image" content={vm.ogImageURL} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={vm.ogImageURL} />
</svelte:head>

<main id="main-content" class="public-invite mx-auto w-full max-w-xl px-6 py-10">
	<PublicNav />
	{#if vm.inviter}
		<section
			class="mt-8 rounded-[var(--radius)] border bg-card-bg p-6 text-center"
			data-invite-accept
		>
			<h1 class="text-xl font-semibold">
				{socialUserTitle(vm.inviter)} invited you to be friends on Norviq
			</h1>
			<p class="mt-2 text-sm text-muted-foreground">{'@' + vm.inviter.username}</p>
			<p class="mt-4 text-sm text-muted-foreground">
				Friends compare streaks, levels and, if they choose, return percentages. Amounts of money
				are never shared.
			</p>
			<form method="post" action={'/friends/invite/' + vm.code + '/accept'} class="mt-6">
				<SubmitButton fullWidth>Add friend</SubmitButton>
			</form>
			<a
				href="/friends"
				class="mt-3 block rounded-[var(--radius-control)] border px-4 py-3 text-center font-medium"
				>Not now</a
			>
		</section>
	{:else}
		{#if vm.inviteError}
			<div class="mt-8">
				<FormErrorBanner message={vm.inviteError} />
			</div>
		{/if}
		<section class="mt-8 rounded-[var(--radius)] border bg-card-bg p-6 text-center">
			<h1 class="text-xl font-semibold">You're invited to Norviq</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				A friend wants to connect with you. Open the invite in the Norviq app to add each other.
			</p>
			<p class="mt-6 text-xs text-muted-foreground">Invite code</p>
			<p class="mt-1 text-2xl font-semibold tabular-nums" data-invite-code>{vm.code}</p>
			<a
				href={vm.appURL}
				class="mt-6 block rounded-[var(--radius-control)] bg-tint px-4 py-3 text-center font-medium text-white"
				data-invite-open>Open in Norviq</a
			>
			<a
				href={vm.appStoreURL}
				class="mt-3 block rounded-[var(--radius-control)] border px-4 py-3 text-center font-medium"
				rel="noopener">Get Norviq on the App Store</a
			>
			{#if vm.signupURL}
				<p class="mt-6 text-sm text-muted-foreground">Or use Norviq on the web</p>
				<a
					href={vm.signupURL}
					class="mt-3 block rounded-[var(--radius-control)] border px-4 py-3 text-center font-medium"
					data-invite-signup>Create an account</a
				>
				<p class="mt-3 text-sm text-muted-foreground">
					Already have one? <a href={vm.loginURL} class="font-medium underline">Log in</a>
				</p>
			{/if}
			<p class="mt-6 text-xs text-muted-foreground">
				Just installed? Open this link again, or go to Friends, then Invite friends, and enter the
				code above.
			</p>
		</section>
	{/if}
</main>
