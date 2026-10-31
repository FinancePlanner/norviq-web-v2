<script lang="ts">
	// groups.templ ChannelPanel: the group header and its channel list.
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import ChannelLink from './ChannelLink.svelte';
	import type { ChannelPanelVM } from './types.js';

	let { vm }: { vm: ChannelPanelVM } = $props();
</script>

<div class="groups-channels-header">
	<a
		href={'/groups/' + vm.groupId + '/settings'}
		class="min-w-0 flex-1 truncate font-semibold"
		title="Group info"
	>
		{#if vm.emoji}
			<span aria-hidden="true">{vm.emoji}</span>
		{/if}
		{vm.groupName}
	</a>
	{#if vm.ticker}
		<a href={'/portfolio/' + vm.ticker} class="groups-ticker-chip">{'$' + vm.ticker}</a>
	{/if}
</div>
<p class="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground">Text channels</p>
<ul class="flex flex-col gap-0.5 px-2">
	{#each vm.channels as channel (channel.id)}
		<li>
			<ChannelLink {channel} />
		</li>
	{/each}
</ul>
{#if vm.canManage}
	<a
		href={'/groups/' + vm.groupId + '/settings#channels'}
		class="mx-2 mt-2 flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
	>
		<Icon name="plus" class="h-4 w-4" />
		Add channel
	</a>
{/if}
{#if vm.canInvite}
	<a
		href={'/groups/' + vm.groupId + '/settings#invite'}
		class="btn-secondary mx-3 mt-4 flex items-center justify-center gap-2 px-3"
	>
		<Icon name="user-plus" class="h-4 w-4" />
		Invite friends
	</a>
{/if}
