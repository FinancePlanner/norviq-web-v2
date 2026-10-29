<script lang="ts">
	// boardsFailure's rendered pages for /admin/community (norviq-web
	// internal/pages/boards/boards.templ NotFoundPage and BannedPage). Any other
	// error looks like (app)/+error.svelte.
	import { page } from '$app/state';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { BOARDS_BANNED, BOARDS_NOT_FOUND } from '#lib/features/settings-admin/admin/boards-admin.js';

	const message = $derived(page.error?.message ?? '');
	const notFoundWhat = $derived(
		page.status === 404 && message.startsWith(BOARDS_NOT_FOUND) ? message.slice(BOARDS_NOT_FOUND.length) : ''
	);
	const banned = $derived(page.status === 403 && message === BOARDS_BANNED);
</script>

<svelte:head>
	<title>{notFoundWhat ? 'Not found - Norviq' : banned ? 'Boards - Norviq' : 'Norviq'}</title>
	{#if notFoundWhat || banned}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

{#if notFoundWhat}
	<div class="app-page-content vigil-document-page boards-page">
		<vigil.ModernPageHeader title="Not found" />
		<p class="glass-card dash-panel max-w-xl p-6 text-sm">
			That {notFoundWhat} doesn't exist or was removed. <a class="underline" href="/boards">All boards</a>
		</p>
	</div>
{:else if banned}
	<div class="app-page-content vigil-document-page boards-page">
		<vigil.ModernPageHeader title="Boards" />
		<p class="glass-card dash-panel max-w-xl p-6 text-sm">
			Your access to Norviq Boards has been removed. The rest of Norviq works as usual. If you think this is a mistake, write
			to us from Settings → Feedback.
		</p>
	</div>
{:else}
	<div class="app-page-content mx-auto max-w-xl py-16 text-center">
		<p class="text-5xl font-bold">{page.status}</p>
		<p class="mt-3 text-muted-foreground">{page.error?.message}</p>
		<a href="/dashboard" class="btn-primary mt-6 inline-flex">Back to dashboard</a>
	</div>
{/if}
