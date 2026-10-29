<script lang="ts">
	// dashboard.ActionQueuePanel / ActionQueueBody: the NOW rail. "Done" posts
	// to /dashboard/action/{id}/read, which answers with the refreshed queue
	// (Go: hx-post → swap #cc-action-queue).
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import EmptyStateInline from '#lib/components/norviq/EmptyStateInline.svelte';
	import GhostButton from '#lib/components/norviq/GhostButton.svelte';
	import { groupCollapsed, groupSummaryTitle, groupedActionQueue } from './overview.js';
	import type { ActionItemVM, ActionQueueVM } from './types.js';

	let { queue }: { queue: ActionQueueVM } = $props();
	let refreshed = $state<ActionQueueVM | null>(null);
	let pending = $state('');
	const vm = $derived(refreshed ?? queue);

	async function markRead(item: ActionItemVM) {
		pending = item.id;
		try {
			const res = await fetch(item.readHref, { method: 'POST', headers: { accept: 'application/json' } });
			if (res.ok) refreshed = (await res.json()) as ActionQueueVM;
		} finally {
			pending = '';
		}
	}
</script>

{#snippet actionRow(item: ActionItemVM)}
	<li class="cc-action-row" data-tone={item.tone} data-kind={item.kind}>
		<a class="cc-action-main" href={item.href}>
			<span class="cc-action-kind">{item.kindLabel}</span>
			<span class="cc-action-title">{item.title}</span>
			{#if item.body}
				<span class="cc-action-body">{item.body}</span>
			{/if}
			{#if item.relativeTime}
				<span class="cc-action-time">{item.relativeTime}</span>
			{/if}
		</a>
		<GhostButton
			class="cc-action-dismiss"
			aria-label={'Dismiss ' + item.title}
			title="Mark as read"
			loading={pending === item.id}
			onclick={() => markRead(item)}
		>
			Done
		</GhostButton>
	</li>
{/snippet}

<div id="cc-action-queue">
	<vigil.Panel class="cc-action-panel" titleID="cc-action-title">
		<div class="cc-panel-head">
			<div class="cc-panel-head-copy">
				<h2 id="cc-action-title" class="cc-panel-title">Action queue</h2>
			</div>
			{#if vm.unreadCount > 0}
				<span class="cc-action-count" aria-label={`${vm.unreadCount} unread items`}>
					{vm.unreadCount}
				</span>
			{/if}
		</div>
		{#if vm.loadError}
			<EmptyStateInline
				title="Action queue unavailable"
				description="We could not reach your notifications just now. Everything else on this page still loaded."
				actionLabel="Open notifications"
				actionHref="/notifications"
			/>
		{:else if vm.actionQueue.length === 0}
			<EmptyStateInline
				title="Nothing needs you"
				description="No open alerts across your portfolio, budget or tax. New items land here as they arrive."
			/>
		{:else}
			<ul class="cc-action-list">
				{#each groupedActionQueue(vm.actionQueue) as group, gi (gi)}
					{#if groupCollapsed(group)}
						<li class="cc-action-row cc-action-group" data-tone={group.tone} data-kind={group.kind}>
							<details class="cc-action-group-details">
								<summary class="cc-action-group-summary">
									<span class="cc-action-kind">{group.kindLabel}</span>
									<span class="cc-action-title">{groupSummaryTitle(group)}</span>
								</summary>
								<ul class="cc-action-sublist">
									{#each group.items as item (item.id)}
										{@render actionRow(item)}
									{/each}
								</ul>
							</details>
						</li>
					{:else}
						{#each group.items as item (item.id)}
							{@render actionRow(item)}
						{/each}
					{/if}
				{/each}
			</ul>
		{/if}
	</vigil.Panel>
</div>
