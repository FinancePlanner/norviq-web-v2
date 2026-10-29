<script lang="ts">
	// groups.templ PreviewPage: a public group seen by someone not in it.
	import { SubmitButton } from '#lib/components/norviq/index.js';
	import GroupTile from '#lib/features/social/groups/GroupTile.svelte';
	import GroupsMeta from '#lib/features/social/groups/GroupsMeta.svelte';
	import Notices from '#lib/features/social/groups/Notices.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<GroupsMeta title={data.group.name + ' - Norviq'} />
<div class="app-page-content vigil-document-page groups-preview-page">
	<Notices error={data.error} />
	<section class="glass-card dash-panel p-6 text-center" data-group-preview>
		<GroupTile group={data.group} size="mx-auto size-16 text-3xl" />
		<h1 class="mt-4 text-xl font-semibold">{data.group.name}</h1>
		{#if data.group.ticker}
			<p class="mt-2"><span class="groups-ticker-chip">{'$' + data.group.ticker}</span></p>
		{/if}
		{#if data.group.description}
			<p class="mt-3 text-sm text-muted-foreground">{data.group.description}</p>
		{/if}
		<p class="mt-3 text-sm text-muted-foreground">
			{data.group.members} members
			{#if data.owner}
				· started by {'@' + data.owner}
			{/if}
		</p>
		<form method="post" action={'/groups/' + data.group.id + '/join'} class="mt-6">
			<SubmitButton fullWidth>Join group</SubmitButton>
		</form>
	</section>
</div>
