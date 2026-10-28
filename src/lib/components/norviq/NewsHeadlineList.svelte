<script lang="ts" module>
	/** components.NewsHeadlineVM */
	export interface NewsHeadlineVM {
		title: string;
		url: string;
		source?: string;
		timeAgo?: string;
	}
</script>

<script lang="ts">
	// components.NewsHeadlineList(items)
	let { items }: { items: NewsHeadlineVM[] } = $props();
</script>

<ul class="news-headline-list" role="list">
	{#each items as item, i (i)}
		<li>
			<a class="news-headline-row row-hover" href={item.url} target="_blank" rel="noopener">
				<span class="news-headline-meta">
					{#if item.source}
						<span>{item.source}</span>
					{/if}
					{#if item.source && item.timeAgo}
						<span aria-hidden="true">·</span>
					{/if}
					{#if item.timeAgo}
						<span>{item.timeAgo}</span>
					{/if}
				</span>
				<span class="news-headline-title">{item.title}</span>
			</a>
		</li>
	{/each}
</ul>
