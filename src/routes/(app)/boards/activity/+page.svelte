<script lang="ts">
	// Port of norviq-web internal/pages/boards/boards.templ ActivityPage.
	import { enhance } from '$app/forms';
	import { CheckboxField, SubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Boards activity - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page boards-page">
	<vigil.ModernPageHeader title="Boards activity" subtitle="Replies to you and upvotes on your posts." />
	{#if data.notice}
		<p class="mb-4 rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm" role="status">{data.notice}</p>
	{/if}
	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
		<section class="glass-card dash-panel divide-y divide-[var(--color-border)]" aria-label="Activity">
			{#if data.rows.length === 0}
				<p class="p-6 text-sm text-muted-foreground">Nothing yet. Replies and upvotes on your posts show up here.</p>
			{/if}
			{#each data.rows as row, i (i)}
				<a
					href={row.link}
					class={['block p-4 hover:bg-black/5 dark:hover:bg-white/5', row.unread && 'border-l-4 border-[var(--color-accent)]']}
					data-activity-row
				>
					<p class="text-sm">
						<span class="font-medium text-[var(--color-accent)]">{row.actor}</span>
						{#if row.kind === 'reply'}
							replied on
						{:else if row.kind === 'upvote'}
							upvoted
						{:else}
							on
						{/if}
						<span class="font-medium">{row.title}</span>
						<span class="text-xs text-muted-foreground">· {row.age}</span>
					</p>
					{#if row.excerpt}
						<p class="mt-1 text-sm text-muted-foreground">“{row.excerpt}”</p>
					{/if}
				</a>
			{/each}
			{#if data.next}
				<div class="p-4"><a class="btn-secondary px-4" href={'/boards/activity?cursor=' + data.next}>Older</a></div>
			{/if}
		</section>
		<aside>
			<section class="glass-card dash-panel p-5">
				<h2 class="text-base font-semibold">Push notifications</h2>
				<p class="mt-1 text-xs text-muted-foreground">Sent to the Norviq iPhone app. This list always keeps everything.</p>
				<form method="post" action="/boards/activity/settings" class="mt-4 space-y-3" use:enhance={withSpinner()}>
					<CheckboxField name="reply_push" value="true" label="Replies to me" checked={data.replyPush} />
					<CheckboxField
						name="upvote_push"
						value="true"
						label="Upvotes on my posts"
						description="At most one push an hour per post."
						checked={data.upvotePush}
					/>
					<SubmitButton fullWidth>Save</SubmitButton>
				</form>
			</section>
		</aside>
	</div>
</div>
