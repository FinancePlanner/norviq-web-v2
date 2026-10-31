<script lang="ts">
	// Port of norviq-web internal/pages/boards/boards.templ AdminPage. The
	// strings are English literals in Go too (no i18n.T on this page).
	import { enhance } from '$app/forms';
	import {
		Field,
		SecondarySubmitButton,
		SelectField,
		SubmitButton,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A failed sanction re-renders the page the way Go's POST did: its URL
	// carried no ?notice=, and the username stays in the field.
	const notice = $derived(form?.error ? '' : data.notice);
	const errorText = $derived(form?.error ?? '');
	const username = $derived(form?.username ?? data.username);

	const kindOptions = [
		{ value: 'mute', label: 'Mute' },
		{ value: 'ban', label: 'Ban' }
	];
	const durationOptions = [
		{ value: '24', label: '1 day' },
		{ value: '168', label: '1 week' },
		{ value: '720', label: '30 days' },
		{ value: '', label: 'Indefinitely' }
	];
</script>

<svelte:head>
	<title>Board moderation - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-canvas-page boards-page">
	<vigil.ModernPageHeader
		title="Board moderation"
		subtitle="Mutes, bans and reports. Only admins see this."
	/>
	{#if notice}
		<p class="mb-4 rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm" role="status">
			{notice}
		</p>
	{/if}
	{#if errorText}
		<p
			class="mb-4 rounded-lg border border-[var(--color-danger)] px-4 py-3 text-sm text-[var(--color-danger)]"
			role="alert"
		>
			{errorText}
		</p>
	{/if}
	<div class="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
		<section class="glass-card dash-panel p-5">
			<h2 class="text-base font-semibold">Mute or ban</h2>
			<p class="mt-1 text-xs text-muted-foreground">
				Mute: can read, can't post, comment or vote. Ban: no access to boards.
			</p>
			<form method="post" action="?/sanction" class="mt-4 space-y-3" use:enhance={withSpinner()}>
				<Field name="username" label="Username" value={username} required />
				<SelectField name="kind" label="Action" options={kindOptions} />
				<SelectField name="duration_hours" label="For" options={durationOptions} />
				<Field name="reason" label="Reason" required placeholder="Spam in /dividends" />
				<SubmitButton fullWidth>Apply</SubmitButton>
			</form>
		</section>
		<div class="space-y-6">
			<section class="glass-card dash-panel" aria-label="Open reports">
				<h2 class="p-4 pb-0 text-base font-semibold">Open reports</h2>
				{#if data.reports.length === 0}
					<p class="p-4 text-sm text-muted-foreground">Nothing to review.</p>
				{/if}
				<ul class="divide-y divide-[var(--color-border)]">
					{#each data.reports as report (report.id)}
						<li class="space-y-2 p-4 text-sm" data-report>
							<p>
								<span class="font-medium">{report.reason}</span> · by {report.reporter} · {report.created}
							</p>
							<p class="text-muted-foreground">{report.author}: “{report.excerpt}”</p>
							{#if report.note}
								<p class="text-xs">Note: {report.note}</p>
							{/if}
							<div class="flex flex-wrap items-center gap-2">
								{#if report.link}
									<a href={report.link} class="btn-secondary px-3 text-xs">Open</a>
								{/if}
								{#if report.author}
									<a
										href={'/admin/community?username=' + report.author}
										class="btn-secondary px-3 text-xs">Mute or ban {report.author}</a
									>
								{/if}
								<!-- The delete forms post to the boards domain's routes, as in Go. -->
								{#if report.isComment && report.commentID}
									<form method="post" action={'/boards/c/' + report.commentID + '/delete'}>
										<input type="hidden" name="post_id" value={report.postID} />
										<input type="hidden" name="return_to" value="/admin/community" />
										<SecondarySubmitButton class="px-3 text-xs text-[var(--color-danger)]"
											>Delete comment</SecondarySubmitButton
										>
									</form>
								{:else if report.postID}
									<form method="post" action={'/boards/p/' + report.postID + '/delete'}>
										<input type="hidden" name="return_to" value="/admin/community" />
										<SecondarySubmitButton class="px-3 text-xs text-[var(--color-danger)]"
											>Delete post</SecondarySubmitButton
										>
									</form>
								{/if}
								<form method="post" action="?/resolve" use:enhance={withSpinner()}>
									<input type="hidden" name="id" value={report.id} />
									<SecondarySubmitButton class="px-3 text-xs">Dismiss</SecondarySubmitButton>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			</section>
			<section class="glass-card dash-panel" aria-label="Sanctions">
				<h2 class="p-4 pb-0 text-base font-semibold">Mutes and bans</h2>
				{#if data.sanctions.length === 0}
					<p class="p-4 text-sm text-muted-foreground">None yet.</p>
				{/if}
				<ul class="divide-y divide-[var(--color-border)]">
					{#each data.sanctions as s (s.id)}
						<li class="flex items-center justify-between gap-3 p-4 text-sm" data-sanction>
							<div class="min-w-0">
								<p><span class="font-medium">{s.username}</span> · {s.kind} · {s.expires}</p>
								<p class="truncate text-xs text-muted-foreground">{s.reason} · {s.created}</p>
							</div>
							{#if s.active}
								<form method="post" action="?/revoke" use:enhance={withSpinner()}>
									<input type="hidden" name="id" value={s.id} />
									<SecondarySubmitButton class="px-3 text-xs">Lift</SecondarySubmitButton>
								</form>
							{:else}
								<span class="text-xs text-muted-foreground">ended</span>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		</div>
	</div>
</div>
