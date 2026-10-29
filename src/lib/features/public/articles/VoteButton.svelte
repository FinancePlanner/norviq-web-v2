<script lang="ts">
	// articles.templ VoteButton. Go swapped the fragment POST /articles/{code}/vote
	// returned (hx-post, hx-vals {"on": …}); here the same POST returns
	// {upvoteCount, voted} and the button updates in place. A refusal leaves it
	// as it was (Go: HX-Reswap none).
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';

	let {
		code,
		count,
		voted,
		canVote,
		loginURL
	}: { code: string; count: number; voted: boolean; canVote: boolean; loginURL: string } = $props();

	// svelte-ignore state_referenced_locally
	let vote = $state({ count, voted });
	let busy = $state(false);

	async function toggle() {
		if (busy) return;
		busy = true;
		try {
			const res = await fetch('/articles/' + code + '/vote', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ on: String(!vote.voted) })
			});
			if (!res.ok) return;
			const out = (await res.json()) as { upvoteCount: number; voted: boolean };
			vote = { count: out.upvoteCount, voted: out.voted };
		} catch {
			/* left as it was */
		} finally {
			busy = false;
		}
	}
</script>

<div id={'article-vote-' + code}>
	{#if canVote}
		<NativeButton
			class="rounded-lg border border-border px-3 py-1.5 text-sm font-medium aria-pressed:bg-muted"
			aria-pressed={vote.voted ? 'true' : 'false'}
			aria-label="Upvote"
			onclick={toggle}
		>
			▲ {vote.count}
		</NativeButton>
	{:else}
		<a href={loginURL} class="rounded-lg border border-border px-3 py-1.5 text-sm font-medium" aria-label="Sign in to upvote"
			>▲ {count}</a
		>
	{/if}
</div>
