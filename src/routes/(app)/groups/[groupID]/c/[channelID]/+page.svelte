<script lang="ts">
	// groups.templ ChatPage. Keyed per channel so moving between channels
	// starts a fresh live chat, as the Go page load did.
	import GroupChat from '#lib/features/social/groups/GroupChat.svelte';
	import GroupsMeta from '#lib/features/social/groups/GroupsMeta.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<GroupsMeta title={data.title} />
<div class="app-page-content vigil-canvas-page groups-page">
	{#key data.vm}
		<GroupChat vm={data.vm} />
	{/key}
</div>
