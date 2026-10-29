<script lang="ts">
	// groups.templ channelLink(channel).
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import { badgeText } from './view.js';
	import type { ChannelItem } from './types.js';

	let { channel }: { channel: ChannelItem } = $props();
</script>

<a
	href={channel.href}
	class={['groups-channel-link', channel.active && 'is-active', channel.unread > 0 && !channel.active && 'has-unread']}
	aria-current={channel.active ? 'page' : undefined}
	data-channel={channel.id}
>
	<Icon name="hash" class="h-4 w-4 shrink-0 text-muted-foreground" />
	<span class="truncate">{channel.name}</span>
	{#if channel.unread > 0 && !channel.active}
		<span class="groups-unread-badge ml-auto">{badgeText(channel.unread)}</span>
	{/if}
</a>
