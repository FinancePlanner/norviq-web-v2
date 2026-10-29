<script lang="ts">
	// groups.templ DiscoverPage.
	import { EmptyState, Field, SubmitButton } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import GroupTile from '#lib/features/social/groups/GroupTile.svelte';
	import GroupsMeta from '#lib/features/social/groups/GroupsMeta.svelte';
	import Notices from '#lib/features/social/groups/Notices.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<GroupsMeta title="Discover groups - Norviq" />
<div class="app-page-content vigil-canvas-page groups-discover-page">
	<vigil.ModernPageHeader title="Discover groups" subtitle="Public groups anyone can join. Search a name, or $AAPL for a ticker." />
	<Notices error={data.error} />
	<form method="get" action="/groups/discover" class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end" role="search">
		<Field name="q" label="Search" value={data.query} placeholder="Dividends or $NVDA" wrapperClass="flex-1" />
		<SubmitButton class="px-5">Search</SubmitButton>
	</form>
	{#if data.results.length === 0}
		{#if data.query}
			<EmptyState
				title="No public groups match"
				description="Try another name or ticker, or start the group yourself."
				actionLabel="Create a group"
				actionHref="/groups/new"
			/>
		{:else}
			<EmptyState
				title="No public groups yet"
				description="Public groups show up here. Start one for a stock you follow."
				actionLabel="Create a group"
				actionHref="/groups/new"
			/>
		{/if}
	{:else}
		<section class="glass-card dash-panel divide-y divide-[var(--color-border)]" aria-label="Public groups">
			{#each data.results as group (group.id)}
				<div class="flex items-center gap-3 p-4" data-discover-row>
					<GroupTile {group} size="size-11 text-xl" />
					<div class="min-w-0 flex-1">
						<p class="truncate font-semibold">
							{group.name}
							{#if group.ticker}
								<span class="groups-ticker-chip ml-1">{'$' + group.ticker}</span>
							{/if}
						</p>
						<p class="mt-0.5 truncate text-sm text-muted-foreground">
							{group.members} members
							{#if group.description}
								· {group.description}
							{/if}
						</p>
					</div>
					{#if group.member}
						<a href={group.href} class="btn-secondary px-4">Open</a>
					{:else}
						<form method="post" action={'/groups/' + group.id + '/join'}>
							<SubmitButton class="px-5">Join</SubmitButton>
						</form>
					{/if}
				</div>
			{/each}
		</section>
		{#if data.next}
			<div class="mt-4"><a class="btn-secondary px-4" href={'/groups/discover?q=' + data.query + '&cursor=' + data.next}>More</a></div>
		{/if}
	{/if}
</div>
