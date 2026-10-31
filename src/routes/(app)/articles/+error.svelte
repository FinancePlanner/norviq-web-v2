<script lang="ts">
	// Errors under /articles/* in the app shell. composeGate's 403 is Go's
	// boards.BannedPage (rendered by loadBoardsViewer for a banned member,
	// title "Boards - Norviq", noindex); anything else falls back to the
	// shell's generic error, as (app)/+error.svelte renders it.
	import { page } from '$app/state';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { BOARDS_BANNED } from '#lib/features/public/articles/articles.js';

	const banned = $derived(page.status === 403 && page.error?.message === BOARDS_BANNED);
</script>

<svelte:head>
	{#if banned}
		<title>Boards - Norviq</title>
		<meta name="robots" content="noindex" />
	{:else}
		<title>Norviq</title>
	{/if}
</svelte:head>

{#if banned}
	<div class="app-page-content vigil-document-page boards-page">
		<vigil.ModernPageHeader title="Boards" />
		<p class="glass-card dash-panel max-w-xl p-6 text-sm">
			Your access to Norviq Boards has been removed. The rest of Norviq works as usual. If you think
			this is a mistake, write to us from Settings → Feedback.
		</p>
	</div>
{:else}
	<div class="app-page-content mx-auto max-w-xl py-16 text-center">
		<p class="text-5xl font-bold">{page.status}</p>
		<p class="mt-3 text-muted-foreground">{page.error?.message}</p>
		<a href="/dashboard" class="btn-primary mt-6 inline-flex">Back to dashboard</a>
	</div>
{/if}
