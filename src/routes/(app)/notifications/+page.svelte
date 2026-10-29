<script lang="ts">
	// automation.InboxPage(vm) — norviq-web internal/pages/automation/page.templ.
	// Both forms are plain posts in Go (no hx-*), so they stay native here.
	import { EmptyState, SubmitButton } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head>
	<title>Notifications - Norviq</title>
	<!-- portfolio.MetaTags() -->
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

<div class="app-page-content vigil-deck-page automation-modern-page space-y-6">
	<vigil.ModernPageHeader title="Notification inbox" subtitle={`${vm.page.unreadCount} unread`}>
		{#snippet actions()}
			<form method="post" action="/notifications/read-all">
				<SubmitButton>Mark all read</SubmitButton>
			</form>
		{/snippet}
	</vigil.ModernPageHeader>
	{#if vm.error}
		<div class="rounded-xl border border-danger p-4" role="alert">{vm.error}</div>
	{/if}
	<div class="space-y-3">
		{#each vm.items as row (row.item.id)}
			<article class="glass-card p-4">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-footnote font-semibold text-muted-foreground">{row.item.kind}</p>
						<h2 class="font-semibold">{row.item.title}</h2>
						<p class="mt-1 text-sm text-muted-foreground">{row.item.body}</p>
						{#if row.webLink}
							<a class="mt-2 inline-block text-sm underline" href={row.webLink}>Review</a>
						{/if}
					</div>
					{#if row.item.readAt == null}
						<form method="post" action={'/notifications/' + row.item.id + '/read'}>
							<SubmitButton>Mark read</SubmitButton>
						</form>
					{/if}
				</div>
			</article>
		{/each}
		{#if (vm.page.items ?? []).length === 0}
			<EmptyState
				title="No notifications"
				description="Price, budget, earnings, tax, screen, and rebalance alerts will appear here."
				actionLabel="Open portfolio"
				actionHref="/portfolio"
			/>
		{/if}
	</div>
	{#if vm.nextURL}
		<div><a class="btn" href={vm.nextURL}>Load older notifications</a></div>
	{/if}
</div>
