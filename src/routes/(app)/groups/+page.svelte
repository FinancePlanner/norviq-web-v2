<script lang="ts">
	// groups.templ HomePage.
	import HomeView from '#lib/features/social/groups/HomeView.svelte';
	import GroupsMeta from '#lib/features/social/groups/GroupsMeta.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<GroupsMeta title="Groups - Norviq" />
<HomeView groups={data.groups} invitations={data.invitations} canDiscover={data.canDiscover} notice={data.notice} error={data.error} />
