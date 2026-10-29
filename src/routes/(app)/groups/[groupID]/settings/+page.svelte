<script lang="ts">
	// groups/settings.templ SettingsPage. Every form posts to its Go URL and
	// comes back here with ?notice= or ?error=.
	import {
		EmptyStateInline,
		Field,
		NativeButton,
		NativeInput,
		SecondarySubmitButton,
		SubmitButton,
		TextareaField
	} from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import GroupsMeta from '#lib/features/social/groups/GroupsMeta.svelte';
	import Notices from '#lib/features/social/groups/Notices.svelte';
	import { roleLabel, settingsSubtitle, topicAllowsTicker } from '#lib/features/social/groups/view.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const base = $derived('/groups/' + data.group.id);
	const confirmSubmit = (message: string) => (event: SubmitEvent) => {
		if (!window.confirm(message)) event.preventDefault();
	};
	function copy(event: MouseEvent) {
		const el = event.currentTarget as HTMLButtonElement;
		navigator.clipboard?.writeText(el.dataset.url ?? '');
		el.textContent = 'Copied';
	}
</script>

<GroupsMeta title={data.group.name + ' - Norviq'} />
<div class="app-page-content vigil-document-page groups-settings-page">
	<vigil.ModernPageHeader title={data.group.name} subtitle={settingsSubtitle(data.group)}>
		{#snippet actions()}
			<a href={data.chatHref} class="btn-secondary px-4">Back to chat</a>
		{/snippet}
	</vigil.ModernPageHeader>
	<Notices notice={data.notice} error={data.error} />
	<div class="space-y-6">
		<section class="glass-card dash-panel p-5" aria-labelledby="notifications-heading">
			<h2 id="notifications-heading" class="text-base font-semibold">Notifications</h2>
			<form method="post" action={base + '/notifications'} class="mt-3 flex items-center justify-between gap-4">
				<p class="text-sm text-muted-foreground">
					{#if data.pushEnabled}
						Push notifications are on for new messages, at most one a minute per channel.
					{:else}
						Push notifications are off. Unread counts still show here and in the app.
					{/if}
				</p>
				{#if data.pushEnabled}
					<NativeInput name="push" type="hidden" value="off" />
					<SecondarySubmitButton class="shrink-0 px-4">Mute</SecondarySubmitButton>
				{:else}
					<NativeInput name="push" type="hidden" value="on" />
					<SubmitButton class="shrink-0 px-4">Unmute</SubmitButton>
				{/if}
			</form>
		</section>
		{#if data.canInvite}
			<section id="invite" class="glass-card dash-panel p-5" aria-labelledby="invite-heading">
				<h2 id="invite-heading" class="text-base font-semibold">Invite friends</h2>
				{#if data.friends.length === 0}
					<EmptyStateInline
						title="No friends to invite yet"
						description="Add friends on Norviq, or share a link below."
						actionLabel="Find friends"
						actionHref="/friends"
					/>
				{:else}
					<form method="post" action={base + '/invitations'} class="mt-3 space-y-3">
						<ul class="max-h-64 space-y-1 overflow-y-auto" data-invite-friends>
							{#each data.friends as friend (friend.id)}
								<li>
									<label class="flex items-center gap-3 rounded-[var(--radius-control)] px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5">
										<NativeInput name="user" type="checkbox" value={friend.id} />
										<span>{friend.name}</span>
									</label>
								</li>
							{/each}
						</ul>
						<SubmitButton class="px-5">Send invitations</SubmitButton>
					</form>
				{/if}
				<h3 class="mt-6 text-sm font-semibold">Invite links</h3>
				<p class="mt-1 text-sm text-muted-foreground">Anyone with a link can join until it expires. Links last 7 days.</p>
				{#if data.links.length > 0}
					<ul class="mt-3 divide-y divide-[var(--color-border)]" data-invite-links>
						{#each data.links as link (link.id)}
							<li class="flex flex-wrap items-center gap-3 py-2">
								<code class="min-w-0 flex-1 truncate text-sm" data-invite-url>{link.url}</code>
								<span class="text-xs text-muted-foreground">{link.uses} · {link.expires}</span>
								<NativeButton class="btn-secondary px-3 text-sm" data-url={link.url} onclick={copy}>Copy</NativeButton>
								<form method="post" action={base + '/invites/' + link.id + '/revoke'}>
									<SecondarySubmitButton class="px-3 text-sm">Revoke</SecondarySubmitButton>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
				<form method="post" action={base + '/invites'} class="mt-3">
					<SecondarySubmitButton class="px-4">Create a link</SecondarySubmitButton>
				</form>
			</section>
		{/if}
		<section id="channels" class="glass-card dash-panel p-5" aria-labelledby="channels-heading">
			<h2 id="channels-heading" class="text-base font-semibold">Channels</h2>
			<ul class="mt-3 divide-y divide-[var(--color-border)]">
				{#each data.channels as channel (channel.id)}
					<li class="flex items-center gap-3 py-2">
						<a href={channel.href} class="flex-1 font-medium"><span class="text-muted-foreground">#</span>{channel.name}</a>
						{#if data.canChannels && data.channels.length > 1}
							<form
								method="post"
								action={base + '/channels/' + channel.id + '/delete'}
								onsubmit={confirmSubmit('Delete this channel and its messages?')}
							>
								<SecondarySubmitButton class="px-3 text-sm text-[var(--color-danger)]">Delete</SecondarySubmitButton>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
			{#if data.canChannels}
				<form method="post" action={base + '/channels'} class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
					<Field
						name="name"
						label="New channel"
						placeholder="earnings"
						required
						description="Lowercase letters, numbers and dashes."
						wrapperClass="flex-1"
					/>
					<SubmitButton class="px-5">Add</SubmitButton>
				</form>
			{/if}
		</section>
		{#if data.canEdit}
			<section class="glass-card dash-panel p-5" aria-labelledby="edit-heading">
				<h2 id="edit-heading" class="text-base font-semibold">Details</h2>
				<form method="post" action={base + '/edit'} class="mt-3 space-y-4">
					<Field name="name" label="Name" value={data.form.name} required />
					<Field name="emoji" label="Icon" value={data.form.emoji} description="One emoji." />
					<TextareaField name="description" label="What it's for" value={data.form.description} rows={3} />
					{#if topicAllowsTicker(data.form.topic)}
						<Field name="ticker" label="Ticker" value={data.form.ticker} />
					{/if}
					<SubmitButton class="px-5">Save</SubmitButton>
				</form>
			</section>
		{/if}
		<section id="members" class="glass-card dash-panel p-5" aria-labelledby="members-heading">
			<h2 id="members-heading" class="text-base font-semibold">Members · {data.group.members}</h2>
			<ul class="mt-3 divide-y divide-[var(--color-border)]" data-group-members>
				{#each data.members as member (member.userId)}
					<li class="flex flex-wrap items-center gap-2 py-2">
						<span class="min-w-0 flex-1 truncate">
							{member.name}
							{#if member.self}
								<span class="text-xs text-muted-foreground">(you)</span>
							{/if}
						</span>
						{#if member.role !== 'member'}
							<span class="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs">{roleLabel(member.role)}</span>
						{/if}
						{#if member.canManage}
							{#if data.isOwner}
								<form method="post" action={base + '/members/' + member.userId + '/role'}>
									{#if member.role === 'admin'}
										<NativeInput name="role" type="hidden" value="member" />
										<SecondarySubmitButton class="px-3 text-sm">Remove admin</SecondarySubmitButton>
									{:else}
										<NativeInput name="role" type="hidden" value="admin" />
										<SecondarySubmitButton class="px-3 text-sm">Make admin</SecondarySubmitButton>
									{/if}
								</form>
							{/if}
							<form
								method="post"
								action={base + '/members/' + member.userId + '/kick'}
								onsubmit={confirmSubmit('Remove them from the group? They can rejoin with an invite.')}
							>
								<SecondarySubmitButton class="px-3 text-sm">Remove</SecondarySubmitButton>
							</form>
							<form
								method="post"
								action={base + '/members/' + member.userId + '/ban'}
								onsubmit={confirmSubmit('Ban them? They will not be able to rejoin.')}
							>
								<SecondarySubmitButton class="px-3 text-sm text-[var(--color-danger)]">Ban</SecondarySubmitButton>
							</form>
							{#if data.isOwner}
								<form
									method="post"
									action={base + '/members/' + member.userId + '/transfer'}
									onsubmit={confirmSubmit('Make them the owner? You become an admin.')}
								>
									<SecondarySubmitButton class="px-3 text-sm">Make owner</SecondarySubmitButton>
								</form>
							{/if}
						{/if}
					</li>
				{/each}
			</ul>
		</section>
		<section class="glass-card dash-panel p-5" aria-labelledby="leave-heading">
			<h2 id="leave-heading" class="text-base font-semibold">Leave</h2>
			{#if data.isOwner}
				<p class="mt-1 text-sm text-muted-foreground">You own this group. Make someone else the owner to leave, or delete it for everyone.</p>
			{:else}
				<form method="post" action={base + '/leave'} class="mt-3" onsubmit={confirmSubmit('Leave this group?')}>
					<SecondarySubmitButton class="px-4">Leave group</SecondarySubmitButton>
				</form>
			{/if}
			{#if data.canDelete}
				<form
					method="post"
					action={base + '/delete'}
					class="mt-3"
					onsubmit={confirmSubmit('Delete this group and every message in it, for everyone?')}
				>
					<SecondarySubmitButton class="px-4 text-[var(--color-danger)]">Delete group</SecondarySubmitButton>
				</form>
			{/if}
		</section>
	</div>
</div>
