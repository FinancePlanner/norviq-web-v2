<script lang="ts">
	// Port of norviq-web internal/pages/boards/boards.templ BoardPage (+
	// boardActions, sortTab, kindChip).
	import { enhance } from '$app/forms';
	import { SecondarySubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import Banners from '#lib/features/social/boards/Banners.svelte';
	import PostRowView from '#lib/features/social/boards/PostRowView.svelte';
	import { boardURL, toggleKind } from '#lib/features/social/boards/boards.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const sorts = [
		{ sort: 'new', label: 'New' },
		{ sort: 'top', label: 'Top' },
		{ sort: 'active', label: 'Comments' }
	];
	const kinds = [
		{ kind: 'ask', label: 'Ask' },
		{ kind: 'show', label: 'Show' }
	];

	const confirmDelete = withSpinner(({ cancel }) => {
		if (!window.confirm('Delete this board and hide all its posts?')) cancel();
	});
</script>

<svelte:head>
	<title>{data.board.name} - Boards - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-canvas-page boards-page">
	<vigil.ModernPageHeader title={data.board.name} subtitle={data.board.description}>
		{#snippet actions()}
			<a href="/boards" class="btn-secondary px-4">All boards</a>
			{#if data.viewer.canWrite}
				<a
					href={'/boards/' + data.board.slug + '/submit'}
					class="btn-primary px-5"
					data-board-post-button>Post</a
				>
			{/if}
			{#if data.viewer.isAdmin}
				<form
					method="post"
					action={'/boards/' + data.board.slug + '/delete'}
					use:enhance={confirmDelete}
				>
					<SecondarySubmitButton class="px-3 text-[var(--color-danger)]"
						>Delete board</SecondarySubmitButton
					>
				</form>
			{/if}
		{/snippet}
	</vigil.ModernPageHeader>
	<Banners viewer={data.viewer} notice={data.notice} />
	<nav class="mb-4 flex flex-wrap items-center gap-2" aria-label="Sort and filter">
		<div class="inline-flex rounded-full border border-[var(--color-border)] p-1">
			{#each sorts as s (s.sort)}
				<a
					href={boardURL(data.board.slug, s.sort, data.kind, data.tag)}
					class={[
						'rounded-full px-3 py-1 text-sm font-medium',
						data.sort === s.sort && 'bg-[var(--color-accent)] text-white'
					]}
					aria-current={data.sort === s.sort ? 'page' : undefined}>{s.label}</a
				>
			{/each}
		</div>
		{#each kinds as k (k.kind)}
			<a
				href={boardURL(data.board.slug, data.sort, toggleKind(data.kind, k.kind), data.tag)}
				class={[
					'rounded-full border border-[var(--color-border)] px-3 py-1 text-sm',
					data.kind === k.kind && 'bg-[var(--color-accent)] text-white'
				]}>{k.label}</a
			>
		{/each}
		{#if data.tag}
			<a
				href={boardURL(data.board.slug, data.sort, data.kind, '')}
				class="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm"
				data-tag-filter>#{data.tag} ✕</a
			>
		{/if}
	</nav>
	<section class="glass-card dash-panel divide-y divide-[var(--color-border)]" aria-label="Posts">
		{#if data.posts.length === 0}
			<p class="p-6 text-sm text-muted-foreground">Nothing here yet.</p>
		{/if}
		{#each data.posts as post (post.id)}
			<PostRowView {post} viewer={data.viewer} backURL={data.backURL} />
		{/each}
	</section>
	{#if data.next}
		<div class="mt-4">
			<a
				class="btn-secondary px-4"
				href={boardURL(data.board.slug, data.sort, data.kind, data.tag) + '&cursor=' + data.next}
				>More</a
			>
		</div>
	{/if}
</div>
