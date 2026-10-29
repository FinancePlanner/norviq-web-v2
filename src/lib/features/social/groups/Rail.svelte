<script lang="ts">
	// groups.templ Rail: the column of the viewer's groups. GroupChat reloads
	// it from /groups/rail when another group changes.
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import { badgeText, initial, railLabel } from './view.js';
	import type { RailItem } from './types.js';

	let { items, invitations }: { items: RailItem[]; invitations: number } = $props();
</script>

<a href="/groups" class="groups-rail-tile groups-rail-home" aria-label="All groups" title="All groups">
	<Icon name="message-circle" class="h-5 w-5" />
	{#if invitations > 0}
		<span class="groups-rail-badge" aria-label={invitations + ' invitations'}>{badgeText(invitations)}</span>
	{/if}
</a>
<span class="groups-rail-divider" aria-hidden="true"></span>
{#each items as item (item.id)}
	<a
		href={item.href}
		class={['groups-rail-tile', item.active && 'is-active', item.unread > 0 && !item.active && 'has-unread']}
		title={item.name}
		aria-label={railLabel(item)}
		aria-current={item.active ? 'page' : undefined}
		data-rail-group={item.id}
	>
		<span aria-hidden="true">{item.emoji ? item.emoji : initial(item.name)}</span>
		{#if item.unread > 0 && !item.active}
			<span class="groups-rail-badge">{badgeText(item.unread)}</span>
		{/if}
	</a>
{/each}
<a href="/groups/new" class="groups-rail-tile groups-rail-action" aria-label="New group" title="New group">
	<Icon name="plus" class="h-5 w-5" />
</a>
<a href="/groups/discover" class="groups-rail-tile groups-rail-action" aria-label="Discover groups" title="Discover groups">
	<Icon name="compass" class="h-5 w-5" />
</a>
