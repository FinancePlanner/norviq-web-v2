<script lang="ts">
	// groupsFailure's rendered pages under /groups (norviq-web
	// internal/handlers/groups.go): a backend 404 is the home page with an
	// error, a community ban the boards banned page. Anything else looks like
	// (app)/+error.svelte.
	import { page } from '$app/state';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { BOARDS_BANNED } from '#lib/features/settings-admin/admin/boards-admin.js';
	import HomeView from '#lib/features/social/groups/HomeView.svelte';
	import GroupsMeta from '#lib/features/social/groups/GroupsMeta.svelte';

	const notFound = $derived(page.status === 404 && page.error?.message === 'groups-not-found');
	const banned = $derived(page.status === 403 && page.error?.message === BOARDS_BANNED);
</script>

{#if notFound}
	<GroupsMeta title="Not found - Norviq" />
	<HomeView error="That group doesn't exist, or you're not in it." />
{:else if banned}
	<svelte:head>
		<title>Boards - Norviq</title>
		<meta name="robots" content="noindex" />
	</svelte:head>
	<div class="app-page-content vigil-document-page boards-page">
		<vigil.ModernPageHeader title="Boards" />
		<p class="glass-card dash-panel max-w-xl p-6 text-sm">
			Your access to Norviq Boards has been removed. The rest of Norviq works as usual. If you think this is a mistake, write
			to us from Settings → Feedback.
		</p>
	</div>
{:else}
	<svelte:head>
		<title>Norviq</title>
	</svelte:head>
	<div class="app-page-content mx-auto max-w-xl py-16 text-center">
		<p class="text-5xl font-bold">{page.status}</p>
		<p class="mt-3 text-muted-foreground">{page.error?.message}</p>
		<a href="/dashboard" class="btn-primary mt-6 inline-flex">Back to dashboard</a>
	</div>
{/if}
