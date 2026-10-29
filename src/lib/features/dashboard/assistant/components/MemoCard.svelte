<script lang="ts">
	// assistant.MemoCard: the position memo a turn wrote. The memo itself is
	// read on its own page; the bubble is too narrow for a document.
	import type { MemoCardRow } from '../types.js';
	import MemoSaveButton from './MemoSaveButton.svelte';

	let { memo }: { memo: MemoCardRow } = $props();
</script>

<div id={'assistant-memo-' + memo.id} class="assistant-action" data-memo-card>
	<p class="assistant-kicker">Position memo</p>
	<p class="mt-2 text-sm font-semibold">{memo.title}</p>
	<p class="mt-1 text-sm">{memo.verdict}</p>
	<div class="assistant-action-controls">
		<a href={'/research/memos/' + memo.id} class="assistant-confirm" data-memo-open>Open</a>
		<MemoSaveButton id={memo.id} bookmarked={memo.bookmarked} />
	</div>
</div>
