<script lang="ts">
	// The post page after a refused comment without JS (Go's renderBoardsPost
	// with errorText at the POST URL). Its URL carries no ?notice=.
	import PostPage from '#lib/features/social/boards/PostPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PostPage
	viewer={data.viewer}
	post={data.post}
	body={data.body}
	comments={data.comments}
	notice=""
	errorText={form?.error ?? ''}
	backURL={data.backURL}
/>
