<script lang="ts">
	// research.MemoNotFound for a 404 (bad id, or the backend's 404); the shell's
	// default error otherwise (Go answered 502 "Memo is temporarily unavailable").
	import { page } from '$app/state';
	import EmptyState from '#lib/components/norviq/EmptyState.svelte';
	import ProGate from '#lib/components/norviq/ProGate.svelte';
</script>

<svelte:head>
	<title>{page.status === 402 && page.error?.proGate ? `${page.error.proGate} - Pro required - Norviq` : page.status === 404 ? 'Memo - Norviq' : 'Norviq'}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if page.status === 402 && page.error?.proGate}
	<ProGate featureName={page.error.proGate} />
{:else if page.status === 404}
	<div class="app-page-content vigil-canvas-page research-page research-modern-page">
		<EmptyState title="Memo not found" description="It may have been deleted. Ask Q for a new DD, for example /dd GRAB." actionLabel="Open Q" actionHref="/assistant" />
	</div>
{:else}
	<div class="app-page-content mx-auto max-w-xl py-16 text-center">
		<p class="text-5xl font-bold">{page.status}</p>
		<p class="mt-3 text-muted-foreground">{page.error?.message}</p>
		<a href="/dashboard" class="btn-primary mt-6 inline-flex">Back to dashboard</a>
	</div>
{/if}
