<script lang="ts">
	// pages/pilots/browse.templ BrowsePage.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { DISCLAIMER } from '#lib/features/settings-admin/pilots/vm.js';
	import type { PilotCardVM } from '#lib/features/settings-admin/pilots/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head>
	<title>Pilots - Norviq</title>
</svelte:head>

{#snippet pilotCard(card: PilotCardVM)}
	<article class="rounded-lg border border-current/10 p-4" data-pilot={card.slug}>
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<a class="font-semibold hover:text-[var(--color-tint)]" href={card.href}>{card.name}</a>
				<p class="mt-1 text-xs text-muted-foreground">{card.kindLabel}</p>
			</div>
			{#if card.followingHref}
				<a
					class="rounded-full bg-[var(--color-tint)]/10 px-2 py-1 text-xs font-medium text-[var(--color-tint)]"
					href={card.followingHref}>Following</a
				>
			{/if}
		</div>
		<p class="mt-3 text-sm tabular-nums">{card.holdingsLabel}</p>
		{#if card.updatedLabel}
			<p class="mt-1 text-xs text-muted-foreground">{card.updatedLabel}</p>
		{/if}
		{#if card.followHref}
			<a class="btn-secondary mt-4 inline-block" href={card.followHref}>Follow</a>
		{/if}
	</article>
{/snippet}

{#snippet pilotSection(id: string, title: string, cards: PilotCardVM[])}
	{#if cards.length > 0}
		<vigil.Panel class="mt-6 p-5 md:p-6" titleID={id}>
			<vigil.PanelHeader {id} {title} />
			<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each cards as card (card.slug)}
					{@render pilotCard(card)}
				{/each}
			</div>
		</vigil.Panel>
	{/if}
{/snippet}

<vigil.CanvasPage
	pageClass="pilots-browse-page"
	title="Pilots"
	subtitle="Follow a politician or a fund. Norviq copies their disclosed trades into a simulation."
>
	{#if vm.notice}
		<div class="mt-2 rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-sm" role="status">{vm.notice}</div>
	{/if}
	<p class="mt-4 max-w-2xl text-sm text-muted-foreground">{DISCLAIMER}</p>
	{#if vm.loadError}
		<p class="mt-4 text-sm text-muted-foreground">Pilots are unavailable right now. Try again shortly.</p>
	{:else}
		{#if vm.follows.length > 0}
			<vigil.Panel class="mt-6 p-5 md:p-6" titleID="pilots-following-title">
				<vigil.PanelHeader id="pilots-following-title" title="Your follows" />
				<ul class="mt-4 divide-y divide-current/10" role="list">
					{#each vm.follows as row (row.id)}
						<li class="flex items-center justify-between gap-3 py-3">
							<div class="min-w-0">
								<a class="font-medium hover:text-[var(--color-tint)]" href={row.href}>{row.pilotName}</a>
								<p class="text-xs text-muted-foreground">{row.targetLabel}</p>
							</div>
							<span class="text-xs text-muted-foreground">{row.statusLabel}</span>
						</li>
					{/each}
				</ul>
			</vigil.Panel>
		{/if}
		{#if vm.politicians.length === 0 && vm.funds.length === 0}
			<p class="mt-4 text-sm text-muted-foreground">No pilots are listed yet.</p>
		{/if}
		{@render pilotSection('pilots-politicians-title', 'Politicians', vm.politicians)}
		{@render pilotSection('pilots-funds-title', 'Funds', vm.funds)}
	{/if}
</vigil.CanvasPage>
