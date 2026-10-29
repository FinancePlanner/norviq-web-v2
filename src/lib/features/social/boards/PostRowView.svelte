<script lang="ts">
	// boards.templ PostRowView + rowMenu: one board line laid out like the Men
	// of Hunger board (vote, title and domain, tags, author and age, counts).
	import { enhance } from '$app/forms';
	import { SecondarySubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import ReportForm from './ReportForm.svelte';
	import VoteButton from './VoteButton.svelte';
	import { boardURL, commentLabel, pathEscape, postURL, type PostRow, type Viewer } from './boards.js';

	let { post, viewer, backURL }: { post: PostRow; viewer: Viewer; backURL: string } = $props();

	const confirmDelete = withSpinner(({ cancel }) => {
		if (!window.confirm('Delete this post?')) cancel();
	});
</script>

<article class="flex gap-3 p-4" id={'post-' + post.id} data-post-row>
	<VoteButton postID={post.id} score={post.score} voted={post.voted} canVote={viewer.canWrite} />
	<div class="min-w-0 flex-1">
		<h2 class="text-base font-semibold leading-snug">
			{#if post.url}
				<a href={post.url} target="_blank" rel="nofollow ugc noopener noreferrer">{post.title}</a>
				<span class="ml-1 text-xs font-normal text-muted-foreground">{post.domain}</span>
			{:else}
				<a href={postURL(post)}>
					{#if post.kind === 'ask'}
						<span class="text-muted-foreground">Ask: </span>
					{:else if post.kind === 'show'}
						<span class="text-muted-foreground">Show: </span>
					{/if}
					{post.title}
				</a>
			{/if}
		</h2>
		<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
			{#each post.tags as tag, i (i)}
				<a href={boardURL(post.boardSlug, 'new', '', tag)} class="rounded-full border border-[var(--color-border)] px-2 py-0.5">{tag}</a>
			{/each}
			{#if post.aiGenerated}
				<span class="rounded-full border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-semibold" data-ai-badge>AI</span>
			{/if}
			<span class="font-medium text-[var(--color-accent)]">{post.author}</span>
			<span>{post.age}</span>
			<a href={postURL(post)} class="hover:underline">
				{commentLabel(post.comments)}
			</a>
			{#if post.newComments > 0}
				<a href={postURL(post)} class="font-medium text-[var(--color-accent)]">{post.newComments} new</a>
			{/if}
		</div>
	</div>
	<div class="flex shrink-0 items-start gap-3 text-xs text-muted-foreground">
		<span title="Participants">👤 {post.participants}</span>
		<span title="Views">👁 {post.views}</span>
		<details class="relative">
			<summary class="cursor-pointer list-none px-1" aria-label="More actions">⋯</summary>
			<div
				class="absolute right-0 z-10 mt-1 w-56 space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-lg"
			>
				<ReportForm field="post_id" id={post.id} {backURL} />
				{#if post.author !== '' && post.author !== viewer.username && !post.aiGenerated}
					<form method="post" action="/boards/block" use:enhance={withSpinner()}>
						<input type="hidden" name="username" value={post.author} />
						<input type="hidden" name="return_to" value={backURL} />
						<SecondarySubmitButton fullWidth class="text-xs">Block {post.author}</SecondarySubmitButton>
					</form>
				{/if}
				{#if post.canDelete}
					<form method="post" action={'/boards/p/' + pathEscape(post.id) + '/delete'} use:enhance={confirmDelete}>
						<SecondarySubmitButton fullWidth class="text-xs text-[var(--color-danger)]">Delete post</SecondarySubmitButton>
					</form>
				{/if}
				{#if viewer.isAdmin && post.author !== '' && post.author !== viewer.username && !post.aiGenerated}
					<a href={'/admin/community?username=' + post.author} class="block text-xs underline">Mute or ban {post.author}</a>
				{/if}
			</div>
		</details>
	</div>
</article>
