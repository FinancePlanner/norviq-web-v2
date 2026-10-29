<script lang="ts">
	// Port of norviq-web internal/pages/boards/boards.templ PostPage.
	import { page } from '$app/state';
	import PostPage from '#lib/features/social/boards/PostPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// A refused comment posts to /boards/p/{id}/comments; the enhanced form
	// applies that action's failure here (see comment-submit.ts).
	const errorText = $derived((page.form as { error?: string } | null)?.error ?? '');
</script>

<PostPage
	viewer={data.viewer}
	post={data.post}
	body={data.body}
	comments={data.comments}
	notice={errorText ? '' : data.notice}
	{errorText}
	backURL={data.backURL}
/>
