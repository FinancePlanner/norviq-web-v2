<script lang="ts">
	// pages/public/group_invite.templ (GroupInviteMetaTags + GroupInvitePage).
	// Join posts to /g/{code}/join ((app)/g/[code]/join/+server.ts).
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import PublicNav from '#lib/features/public/stock/PublicNav.svelte';

	let { data } = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head>
	<title>Join my group on Norviq</title>
	<meta name="description" content="You've been invited to a group on Norviq." />
	<meta name="robots" content="noindex,nofollow" />
	<meta name="referrer" content="no-referrer" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Norviq" />
	<meta property="og:url" content={vm.canonicalURL} />
	<meta property="og:title" content="Join my group on Norviq" />
	<meta
		property="og:description"
		content="Chat with friends about the stocks, ETFs and topics you follow."
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
	{#if vm.inviteError}
		<div class="mt-8">
			<FormErrorBanner message={vm.inviteError} />
		</div>
	{/if}
	{#if vm.groupName}
		<section
			class="mt-8 rounded-[var(--radius)] border bg-card-bg p-6 text-center"
			data-group-invite-join
		>
			{#if vm.groupEmoji}
				<p class="text-4xl" aria-hidden="true">{vm.groupEmoji}</p>
			{/if}
			<h1 class="mt-2 text-xl font-semibold">
				{#if vm.inviter}
					{'@' + vm.inviter} invited you to {vm.groupName}
				{:else}
					Join {vm.groupName}
				{/if}
			</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				{#if vm.groupTicker}
					{'$' + vm.groupTicker} ·
				{/if}
				{vm.members} members
			</p>
			{#if vm.openURL}
				<p class="mt-4 text-sm text-muted-foreground">You're already in this group.</p>
				<a
					href={vm.openURL}
					class="mt-6 block rounded-[var(--radius-control)] bg-tint px-4 py-3 text-center font-medium text-white"
					>Open group</a
				>
			{:else}
				<form method="post" action={'/g/' + vm.code + '/join'} class="mt-6">
					<SubmitButton fullWidth>Join group</SubmitButton>
				</form>
				<a
					href="/groups"
					class="mt-3 block rounded-[var(--radius-control)] border px-4 py-3 text-center font-medium"
					>Not now</a
				>
			{/if}
		</section>
	{:else if vm.signupURL || !vm.inviteError}
		<section class="mt-8 rounded-[var(--radius)] border bg-card-bg p-6 text-center">
			<h1 class="text-xl font-semibold">You're invited to a group on Norviq</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				A friend wants you in their group chat. Open the invite in the Norviq app to join.
			</p>
			<a
				href={vm.appURL}
				class="mt-6 block rounded-[var(--radius-control)] bg-tint px-4 py-3 text-center font-medium text-white"
				data-group-invite-open>Open in Norviq</a
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
					data-group-invite-signup>Create an account</a
				>
				<p class="mt-3 text-sm text-muted-foreground">
					Already have one? <a href={vm.loginURL} class="font-medium underline">Log in</a>
				</p>
			{/if}
		</section>
	{/if}
</main>
