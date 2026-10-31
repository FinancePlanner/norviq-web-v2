<script lang="ts">
	// Port of norviq-web internal/pages/boards/boards.templ DirectoryPage. The
	// strings are English literals in Go too (no i18n.T on boards pages).
	import { enhance } from '$app/forms';
	import { Field, SubmitButton, TextareaField, withSpinner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import Banners from '#lib/features/social/boards/Banners.svelte';
	import PostRowView from '#lib/features/social/boards/PostRowView.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A refused create re-renders the page the way Go's POST did: its URL
	// carried no ?notice=, and the fields keep what was typed.
	const notice = $derived(form?.error ? '' : data.notice);
	const values = $derived(form?.form ?? { slug: '', name: '', description: '' });
</script>

<svelte:head>
	<title>Boards - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-canvas-page boards-page">
	<vigil.ModernPageHeader
		title="Boards"
		subtitle="Topic boards made by Norviq members. Ideas and questions, not advice."
	/>
	<Banners viewer={data.viewer} {notice} errorText={form?.error ?? ''} />
	{#if data.daily}
		<section class="glass-card dash-panel mb-6" aria-label="Daily post" data-daily-post>
			<PostRowView post={data.daily} viewer={data.viewer} backURL="/boards" />
		</section>
	{/if}
	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
		<section
			class="glass-card dash-panel divide-y divide-[var(--color-border)]"
			aria-label="All boards"
		>
			{#if data.boards.length === 0}
				<p class="p-6 text-sm text-muted-foreground">No boards yet. Start the first one.</p>
			{/if}
			{#each data.boards as board (board.slug)}
				<a
					href={'/boards/' + board.slug}
					class="block p-4 hover:bg-black/5 dark:hover:bg-white/5"
					data-board-card
				>
					<div class="flex items-baseline justify-between gap-3">
						<p class="font-semibold">
							{board.name}
							<span class="text-xs font-normal text-muted-foreground">/{board.slug}</span>
						</p>
						<p class="shrink-0 text-xs text-muted-foreground">
							{board.postCount} posts · {board.lastActivity}
						</p>
					</div>
					{#if board.description}
						<p class="mt-1 text-sm text-muted-foreground">{board.description}</p>
					{/if}
				</a>
			{/each}
			{#if data.next}
				<div class="p-4">
					<a class="btn-secondary px-4" href={'/boards?cursor=' + data.next}>More boards</a>
				</div>
			{/if}
		</section>
		<aside class="space-y-4">
			{#if data.viewer.canWrite}
				<section class="glass-card dash-panel p-5">
					<h2 class="text-base font-semibold">Start a board</h2>
					<p class="mt-1 text-xs text-muted-foreground">
						Up to 3 a day. Keep it about money, markets or Norviq.
					</p>
					<form
						method="post"
						action="/boards"
						class="mt-4 space-y-3"
						use:enhance={withSpinner(
							() =>
								async ({ update }) =>
									update({ reset: false })
						)}
					>
						<Field
							name="name"
							label="Name"
							value={values.name}
							required
							placeholder="Dividend investing"
						/>
						<Field
							name="slug"
							label="Address"
							value={values.slug}
							required
							placeholder="dividends"
							description="norviq.org/boards/… — lowercase letters, numbers and dashes."
						/>
						<TextareaField
							name="description"
							label="What it's for"
							value={values.description}
							rows={3}
						/>
						<SubmitButton fullWidth>Create board</SubmitButton>
					</form>
				</section>
			{/if}
			<a
				href="/boards/activity"
				class="btn-secondary block px-4 text-center"
				data-boards-activity-link
			>
				Activity
				{#if data.unread > 0}
					<span class="ml-1 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-xs text-white"
						>{data.unread}</span
					>
				{/if}
			</a>
			{#if data.viewer.isAdmin}
				<a href="/admin/community" class="btn-secondary block px-4 text-center">Moderation</a>
			{/if}
		</aside>
	</div>
</div>
