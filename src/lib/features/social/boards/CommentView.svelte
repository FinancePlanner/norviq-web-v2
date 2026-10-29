<script lang="ts">
	// boards.templ commentView: one comment, indented by depth, with reply,
	// report, delete and (for admins) the moderation link.
	import { enhance } from '$app/forms';
	import { commentSubmit } from './comment-submit.js';
	import { SecondarySubmitButton, SubmitButton, TextareaField, withSpinner } from '#lib/components/norviq/index.js';
	import ReportForm from './ReportForm.svelte';
	import { pathEscape, type CommentRow, type PostRow, type Viewer } from './boards.js';

	let {
		post,
		viewer,
		backURL,
		comment
	}: { post: PostRow; viewer: Viewer; backURL: string; comment: CommentRow } = $props();
</script>

<article id={'c-' + comment.id} class="border-l-2 border-[var(--color-border)] pl-3" style={`margin-left: ${comment.depth}rem`} data-comment>
	<p class="text-xs text-muted-foreground">
		{#if comment.deleted}
			[deleted]
		{:else}
			<span class="font-medium text-[var(--color-accent)]">{comment.author}</span>
		{/if}
		· {comment.age}
	</p>
	{#if !comment.deleted}
		<p class="mt-1 whitespace-pre-line text-sm">{comment.body}</p>
		<div class="mt-1 flex flex-wrap items-start gap-3 text-xs">
			{#if comment.canReply}
				<details>
					<summary class="cursor-pointer text-muted-foreground hover:underline">Reply</summary>
					<form method="post" action={'/boards/p/' + pathEscape(post.id) + '/comments'} class="mt-2 space-y-2" use:enhance={commentSubmit(post)}>
						<input type="hidden" name="parent_id" value={comment.id} />
						<TextareaField name="body" label="Reply" rows={2} required />
						<SubmitButton class="text-xs">Reply</SubmitButton>
					</form>
				</details>
			{/if}
			<details>
				<summary class="cursor-pointer text-muted-foreground hover:underline">Report</summary>
				<div class="mt-2 w-56">
					<ReportForm field="comment_id" id={comment.id} {backURL} />
				</div>
			</details>
			{#if comment.canDelete}
				<form method="post" action={'/boards/c/' + pathEscape(comment.id) + '/delete'} use:enhance={withSpinner()}>
					<input type="hidden" name="post_id" value={post.id} />
					<SecondarySubmitButton class="px-2 py-0 text-xs text-[var(--color-danger)]">Delete</SecondarySubmitButton>
				</form>
			{/if}
			{#if viewer.isAdmin && comment.author !== '' && comment.author !== viewer.username}
				<a href={'/admin/community?username=' + comment.author} class="text-muted-foreground underline">Mute or ban</a>
			{/if}
		</div>
	{/if}
</article>
