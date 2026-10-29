<script lang="ts">
	// groups.templ MessageRowView + messageMenu. The delete and report forms
	// were hx-post swaps; here they post with fetch and the chat updates its
	// rows. Without JS they still post and redirect, as in Go.
	import { NativeButton, NativeInput, NativeSelect } from '#lib/components/norviq/index.js';
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import { reportReasons } from './view.js';
	import type { MessageRow } from './types.js';

	let {
		row,
		chat,
		showDay = true,
		ondeleted
	}: { row: MessageRow; chat: string; showDay?: boolean; ondeleted?: (row: MessageRow) => void } = $props();

	let reported = $state(false);
	const reasonOptions = reportReasons.map((r) => ({ value: r.value, label: r.label }));

	async function deleteMessage(event: SubmitEvent) {
		event.preventDefault();
		if (!window.confirm('Delete this message?')) return;
		const form = event.currentTarget as HTMLFormElement;
		try {
			const res = await fetch(form.action, {
				method: 'POST',
				body: new FormData(form),
				headers: { 'X-Groups-Fetch': '1' },
				credentials: 'same-origin'
			});
			if (res.ok) ondeleted?.(row);
		} catch {
			/* htmx left the row as it was */
		}
	}

	async function report(event: SubmitEvent) {
		event.preventDefault();
		const form = event.currentTarget as HTMLFormElement;
		try {
			const res = await fetch(form.action, {
				method: 'POST',
				body: new FormData(form),
				headers: { 'X-Groups-Fetch': '1' },
				credentials: 'same-origin'
			});
			if (res.ok) reported = true;
		} catch {
			/* htmx left the form as it was */
		}
	}
</script>

{#if row.dayLabel && showDay}
	<li class="groups-day" data-groups-day={row.stamp.slice(0, 10)} role="separator"><span>{row.dayLabel}</span></li>
{/if}
{#if row.newDivider}
	<li class="groups-new-divider" data-groups-new-divider role="separator"><span>New messages</span></li>
{/if}
<li
	id={'msg-' + row.seq}
	class={['groups-message', row.continued && 'is-continued', row.own && 'is-own', row.deleted && 'is-deleted']}
	data-seq={row.seq}
	data-message-id={row.id}
	data-client-id={row.clientId}
>
	{#if row.continued}
		<time class="groups-message-hover-time" datetime={row.stamp}>{row.time}</time>
	{:else}
		<span class="groups-avatar" aria-hidden="true">{row.initial}</span>
	{/if}
	<div class="groups-message-body">
		{#if !row.continued}
			<p class="groups-message-meta">
				<span class="font-semibold">{row.author}</span>
				<time class="text-xs text-muted-foreground" datetime={row.stamp}>{row.time}</time>
			</p>
		{/if}
		{#if row.deleted}
			<p class="groups-message-text italic text-muted-foreground">Message deleted</p>
		{:else}
			<p class="groups-message-text">
				{#each row.segments as segment, i (i)}{#if segment.ticker}<a
							href={'/portfolio/' + segment.ticker}
							class="groups-ticker-chip"
							data-ticker={segment.ticker}>{segment.text}</a
						>{:else}{segment.text}{/if}{/each}
			</p>
		{/if}
	</div>
	{#if row.canDelete || row.canReport}
		<details class="groups-message-menu">
			<summary class="groups-icon-button" aria-label="Message actions">
				<Icon name="ellipsis" class="h-4 w-4" />
			</summary>
			<div class="groups-message-menu-panel">
				{#if row.canDelete}
					<form method="post" action={'/groups/m/' + row.id + '/delete'} onsubmit={deleteMessage}>
						<NativeInput name="seq" type="hidden" value={String(row.seq)} />
						<NativeButton type="submit" class="groups-menu-item text-[var(--color-danger)]">
							<Icon name="trash-2" class="h-4 w-4" />
							Delete
						</NativeButton>
					</form>
				{/if}
				{#if row.canReport}
					{#if reported}
						<p class="p-2 text-xs text-muted-foreground" role="status">Thanks. A person will review it.</p>
					{:else}
						<form method="post" action={'/groups/m/' + row.id + '/report'} class="space-y-2 p-2" onsubmit={report}>
							<label class="text-xs font-semibold text-muted-foreground" for={'report-' + row.id}>Report</label>
							<NativeSelect id={'report-' + row.id} name="reason" class="field-input text-xs" options={reasonOptions} />
							<NativeButton type="submit" class="groups-menu-item">
								<Icon name="flag" class="h-4 w-4" />
								Send report
							</NativeButton>
						</form>
					{/if}
					<form method="post" action="/groups/block" data-sveltekit-reload>
						<NativeInput name="username" type="hidden" value={row.author} />
						<NativeInput name="return_to" type="hidden" value={chat} />
						<NativeButton type="submit" class="groups-menu-item">
							<Icon name="ban" class="h-4 w-4" />
							{'Block @' + row.author}
						</NativeButton>
					</form>
				{/if}
			</div>
		</details>
	{/if}
</li>
