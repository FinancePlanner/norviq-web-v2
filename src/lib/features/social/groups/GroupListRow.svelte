<script lang="ts">
	// groups.templ groupListRow(group).
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import GroupTile from './GroupTile.svelte';
	import { badgeText, topicLabel } from './view.js';
	import type { GroupCard } from './types.js';

	let { group }: { group: GroupCard } = $props();
</script>

<a
	href={group.href}
	class="flex items-center gap-3 p-4 hover:bg-black/5 dark:hover:bg-white/5"
	data-group-row
>
	<GroupTile {group} size="size-11 text-xl" />
	<div class="min-w-0 flex-1">
		<div class="flex items-baseline gap-2">
			<p class="truncate font-semibold">{group.name}</p>
			{#if group.ticker}
				<span class="groups-ticker-chip">{'$' + group.ticker}</span>
			{/if}
			{#if group.muted}
				<span class="text-muted-foreground" title="Notifications off">
					<Icon name="bell-off" class="h-3.5 w-3.5" />
				</span>
			{/if}
			<span class="ml-auto shrink-0 text-xs text-muted-foreground">{group.activity}</span>
		</div>
		<p class="mt-0.5 truncate text-sm text-muted-foreground">
			{#if group.preview}
				{group.preview}
			{:else}
				{group.members} members · {topicLabel(group.topic)}
			{/if}
		</p>
	</div>
	{#if group.unread > 0}
		<span class="groups-unread-badge" aria-label={group.unread + ' unread'}
			>{badgeText(group.unread)}</span
		>
	{/if}
</a>
