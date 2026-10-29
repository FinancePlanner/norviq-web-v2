<script lang="ts">
	// groups.templ HomePage: invitations, then the viewer's groups by latest
	// activity. Also the body of groupsFailure's 404 (Error set, no groups).
	import { EmptyState, Field, SecondarySubmitButton, SubmitButton } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import GroupListRow from './GroupListRow.svelte';
	import GroupTile from './GroupTile.svelte';
	import Notices from './Notices.svelte';
	import type { GroupCard, InvitationRow } from './types.js';

	let {
		groups = [],
		invitations = [],
		canDiscover = false,
		notice = '',
		error = ''
	}: { groups?: GroupCard[]; invitations?: InvitationRow[]; canDiscover?: boolean; notice?: string; error?: string } = $props();
</script>

<div class="app-page-content vigil-canvas-page groups-home-page">
	<vigil.ModernPageHeader title="Groups" subtitle="Chat with friends about what you hold. Ideas and questions, not advice.">
		{#snippet actions()}
			{#if canDiscover}
				<a href="/groups/discover" class="btn-secondary px-4">Discover</a>
			{/if}
			<a href="/groups/new" class="btn-primary px-5" data-groups-new>New group</a>
		{/snippet}
	</vigil.ModernPageHeader>
	<Notices {notice} {error} />
	{#if invitations.length > 0}
		<section class="glass-card dash-panel mb-6 divide-y divide-[var(--color-border)]" aria-label="Invitations" data-groups-invitations>
			{#each invitations as invitation (invitation.id)}
				<div class="flex flex-wrap items-center gap-3 p-4">
					<GroupTile group={invitation.group} size="size-10 text-lg" />
					<div class="min-w-0 flex-1">
						<p class="font-semibold">{invitation.group.name}</p>
						<p class="text-sm text-muted-foreground">
							{#if invitation.inviter}
								{'@' + invitation.inviter} invited you
							{:else}
								You're invited
							{/if}
							· {invitation.group.members} members
						</p>
					</div>
					<form method="post" action={'/groups/invitations/' + invitation.id + '/decline'}>
						<SecondarySubmitButton class="px-4">Decline</SecondarySubmitButton>
					</form>
					<form method="post" action={'/groups/invitations/' + invitation.id + '/accept'}>
						<SubmitButton class="px-5">Join</SubmitButton>
					</form>
				</div>
			{/each}
		</section>
	{/if}
	{#if groups.length === 0}
		<EmptyState
			title="Chat about what you hold, with people you trust"
			description="Start a group for a stock, an ETF or anything else, then invite your friends. Every group starts with #general."
			actionLabel="Create a group"
			actionHref="/groups/new"
		/>
	{:else}
		<section class="glass-card dash-panel divide-y divide-[var(--color-border)]" aria-label="Your groups">
			{#each groups as group (group.id)}
				<GroupListRow {group} />
			{/each}
		</section>
	{/if}
	<section class="mt-6 glass-card dash-panel p-5" aria-label="Join with a link">
		<h2 class="text-base font-semibold">Got an invite link?</h2>
		<form method="get" action="/groups/join" class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
			<Field name="link" label="Invite link or code" placeholder="norviq.org/g/…" wrapperClass="flex-1" />
			<SubmitButton class="px-5">Open</SubmitButton>
		</form>
	</section>
</div>
