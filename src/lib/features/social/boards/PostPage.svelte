<script lang="ts">
	// boards.templ PostPage. Rendered by /boards/[slug]/p/[id] and, after a
	// refused comment without JS, by /boards/p/[id]/comments (Go re-rendered the
	// post page at the POST URL with a 422).
	import { enhance } from '$app/forms';
	import { commentSubmit } from './comment-submit.js';
	import { SubmitButton, TextareaField } from '#lib/components/norviq/index.js';
	import Banners from './Banners.svelte';
	import CommentView from './CommentView.svelte';
	import PostRowView from './PostRowView.svelte';
	import { pathEscape, type CommentRow, type PostRow, type Viewer } from './boards.js';

	let {
		viewer,
		post,
		body,
		comments,
		notice,
		errorText,
		backURL
	}: {
		viewer: Viewer;
		post: PostRow;
		body: string;
		comments: CommentRow[];
		notice: string;
		errorText: string;
		backURL: string;
	} = $props();
</script>

<svelte:head>
	<title>{post.title} - Boards - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page boards-page">
	<a href={'/boards/' + pathEscape(post.boardSlug)} class="text-sm text-muted-foreground hover:underline">← /{post.boardSlug}</a>
	<Banners {viewer} {notice} {errorText} />
	<section class="glass-card dash-panel mt-3">
		<PostRowView {post} {viewer} {backURL} />
		{#if body}
			<div class="whitespace-pre-line px-4 pb-4 pl-15 text-sm leading-relaxed">{body}</div>
		{/if}
	</section>
	{#if viewer.canWrite}
		<form method="post" action={'/boards/p/' + pathEscape(post.id) + '/comments'} class="mt-4 space-y-2" use:enhance={commentSubmit(post)}>
			<TextareaField name="body" label="Add a comment" rows={3} required />
			<SubmitButton>Comment</SubmitButton>
		</form>
	{/if}
	<section class="mt-6 space-y-3" aria-label="Comments">
		{#each comments as comment (comment.id)}
			<CommentView {post} {viewer} {backURL} {comment} />
		{/each}
	</section>
</div>
