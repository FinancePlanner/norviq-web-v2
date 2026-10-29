<script lang="ts">
	// articles.templ card(c)
	import type { Card } from './types.js';

	let { card: c }: { card: Card } = $props();
</script>

<li class="rounded-xl border border-border p-5">
	<div class="flex flex-wrap gap-2 text-sm font-medium text-[var(--color-accent)]">
		{#each c.tickers as t (t)}
			<a href={'/articles/ticker/' + t} class="hover:underline">{'$' + t}</a>
		{/each}
	</div>
	<h2 class="mt-2 text-xl font-semibold leading-snug"><a href={c.url} class="hover:underline">{c.title}</a></h2>
	{#if c.firstBullet !== ''}
		<p class="mt-2 text-muted-foreground">{c.firstBullet}</p>
	{/if}
	<p class="mt-3 text-sm text-muted-foreground">
		{c.byline} · ▲ {c.upvotes} · {c.views} views
	</p>
</li>
