<script lang="ts">
	import { page } from '$app/state';
	import ProGate from '#lib/components/norviq/ProGate.svelte';
</script>

<svelte:head>
	<title>{page.error?.proGate ? `${page.error.proGate} - Pro required - Norviq` : 'Norviq'}</title>
</svelte:head>

{#if page.status === 402 && page.error?.proGate}
	<ProGate featureName={page.error.proGate} />
{:else}
	<div class="app-page-content mx-auto max-w-xl py-16 text-center">
		<p class="text-5xl font-bold">{page.status}</p>
		<p class="mt-3 text-muted-foreground">{page.error?.message}</p>
		<a href="/dashboard" class="btn-primary mt-6 inline-flex">Back to dashboard</a>
	</div>
{/if}
