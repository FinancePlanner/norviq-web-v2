<script lang="ts">
	// assistant.Message.
	import type { MessageRow } from '../types.js';
	import ActionSlot from './ActionSlot.svelte';
	import MemoCard from './MemoCard.svelte';

	let { message, onreply }: { message: MessageRow; onreply: (message: MessageRow) => void } =
		$props();

	// marked is loaded only once a Q reply is on screen: a static import would add it to every
	// app route, since Quick Q lives in the app layout (scripts/size-budget.mjs).
	let renderMd: ((src: string) => string) | null = $state(null);
	$effect(() => {
		if (message.role !== 'assistant' || renderMd) return;
		void import('#lib/markdown.js').then((m) => (renderMd = m.render));
	});
</script>

<div class={['muse-message', message.role]} id={'assistant-message-' + message.id}>
	{#if message.caption !== ''}
		<p class="muse-caption" data-muse-caption>{message.caption}</p>
	{/if}
	<div class="muse-bubble">
		{#if message.role === 'assistant' && renderMd}
			<!-- Q replies are Markdown. render() is the article allowlist: raw HTML is dropped. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by #lib/markdown.js -->
			<div class="muse-text muse-md">{@html renderMd(message.content)}</div>
		{:else}
			<div class="muse-text">{message.content}</div>
		{/if}
		<time class="muse-time">{message.createdAt}</time>
		{#if message.action}
			<ActionSlot action={message.action} {onreply} />
		{/if}
		{#if message.memo}
			<MemoCard memo={message.memo} />
		{/if}
	</div>
</div>
