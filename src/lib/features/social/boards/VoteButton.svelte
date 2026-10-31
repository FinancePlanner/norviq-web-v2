<script lang="ts">
	// boards.templ VoteButton. Go hx-posts to /boards/p/{id}/vote and swaps the
	// returned fragment; here the endpoint answers {score, voted} and the button
	// updates in place. A refusal (422) leaves it unchanged, like HX-Reswap: none.
	import { NativeButton } from '#lib/components/norviq/index.js';
	import { pathEscape, voteClass } from './boards.js';

	let {
		postID,
		score,
		voted,
		canVote
	}: { postID: string; score: number; voted: boolean; canVote: boolean } = $props();

	// Overridable derived: follows the props, and a vote writes the backend's answer over it.
	let current = $derived({ score, voted });
	let busy = $state(false);

	async function vote() {
		if (busy) return;
		busy = true;
		try {
			const res = await fetch('/boards/p/' + pathEscape(postID) + '/vote', { method: 'POST' });
			if (res.ok) current = (await res.json()) as { score: number; voted: boolean };
		} catch {
			/* network failure: leave the button as it was */
		} finally {
			busy = false;
		}
	}
</script>

<div id={'vote-' + postID} class="flex w-8 shrink-0 flex-col items-center text-xs" data-vote>
	{#if canVote}
		<NativeButton
			class={voteClass(current.voted)}
			aria-pressed={current.voted ? 'true' : 'false'}
			aria-label="Upvote"
			onclick={vote}
		>
			▲
		</NativeButton>
	{:else}
		<span class="p-1 text-muted-foreground" aria-hidden="true">▲</span>
	{/if}
	{#if current.score > 0}
		<span class="font-medium">{current.score}</span>
	{/if}
</div>
