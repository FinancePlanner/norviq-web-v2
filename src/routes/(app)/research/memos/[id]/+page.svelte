<script lang="ts">
	// /research/memos/{id} (internal/pages/research/memo.templ MemoPage). Every
	// figure in the mark block comes from the server; sections are escaped prose.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import SecondarySubmitButton from '#lib/components/norviq/SecondarySubmitButton.svelte';
	import AIConsentPage from '#lib/components/norviq/AIConsentPage.svelte';
	import MemoSaveButton from '#lib/features/planning-tools/research/MemoSaveButton.svelte';
	import { postAndFollow } from '#lib/features/planning-tools/research/form-follow.js';

	let { data } = $props();
</script>

<svelte:head>
	{#if data.aiConsentRequired}
		<title>Allow AI features - Norviq</title>
	{:else}
		<title>{data.vm.title} - Norviq</title>
	{/if}
	<meta name="robots" content="noindex" />
</svelte:head>

{#if data.aiConsentRequired}
	<AIConsentPage next={data.next} />
{:else}
	{@const vm = data.vm}
	<div class="app-page-content vigil-canvas-page research-page research-modern-page">
		<vigil.ModernPageHeader title={vm.title} subtitle={vm.symbol + ' · ' + vm.createdAt} />
		<div id="memo-feedback"></div>
		<div class="mt-4 flex flex-wrap items-center gap-3">
			<MemoSaveButton id={vm.id} bookmarked={vm.bookmarked} />
			<form method="POST" action={'/research/memos/' + vm.id + '/delete'} onsubmit={postAndFollow}>
				<SecondarySubmitButton class="px-3 py-1 text-xs text-[var(--color-danger)]">Delete</SecondarySubmitButton>
			</form>
			<a href="/research" class="btn-secondary px-4">All research</a>
		</div>
		<div class="mt-6 space-y-4">
			{#if vm.mark.length > 0}
				<article class="glass-card dash-panel p-6" data-memo-mark>
					<h2 class="text-lg font-semibold">Your mark</h2>
					<dl class="mt-4 grid gap-3 sm:grid-cols-2">
						{#each vm.mark as row, i (i)}
							<div>
								<dt class="text-xs font-bold text-muted-foreground">{row.label}</dt>
								<dd class="mt-1 text-sm">{row.value}</dd>
							</div>
						{/each}
					</dl>
				</article>
			{/if}
			{#each vm.sections as section, i (i)}
				<article class="glass-card dash-panel p-6">
					<h2 class="text-lg font-semibold">{section.heading}</h2>
					{#each section.paragraphs as paragraph, j (j)}
						<p class="mt-3 text-sm leading-relaxed">{paragraph}</p>
					{/each}
				</article>
			{/each}
			{#if vm.verdict}
				<article class="glass-card dash-panel p-6">
					<h2 class="text-lg font-semibold">Q's view</h2>
					<p class="mt-3 text-sm leading-relaxed">{vm.verdict}</p>
				</article>
			{/if}
			<p class="text-xs text-muted-foreground">{vm.footer}</p>
			{#if vm.sources.length > 0}
				<article class="glass-card dash-panel p-6">
					<h2 class="text-sm font-semibold">Sources</h2>
					<ul class="mt-3 space-y-1 text-xs">
						{#each vm.sources as source, i (i)}
							<li>
								{#if source.url}
									<a href={source.url} target="_blank" rel="noopener noreferrer nofollow" class="underline">{source.label}</a>
								{:else}
									<span>{source.label}</span>
								{/if}
								{#if source.meta}
									<span class="text-muted-foreground"> · {source.meta}</span>
								{/if}
							</li>
						{/each}
					</ul>
				</article>
			{/if}
		</div>
	</div>
{/if}
