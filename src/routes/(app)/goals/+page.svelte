<script lang="ts">
	// goals.Page(vm) — norviq-web internal/pages/goals/page.templ.
	import { enhance } from '$app/forms';
	import {
		EmptyState,
		FormErrorBanner,
		NativeButton,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import CreateForm from '#lib/features/dashboard/goals/CreateForm.svelte';
	import GoalCard from '#lib/features/dashboard/goals/GoalCard.svelte';
	import GoalDetail from '#lib/features/dashboard/goals/GoalDetail.svelte';
	import {
		activeCount,
		atGoalLimit,
		firstCurrency,
		money
	} from '#lib/features/dashboard/goals/view.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
	const items = $derived(vm.overview.items ?? []);

	// Alpine x-data="{ createOpen: false }"
	let createOpen = $state(false);
</script>

<svelte:head>
	<title>Financial goals - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') createOpen = false;
	}}
/>

{#snippet goalMetricPanel(label: string, value: string)}
	<vigil.Panel>
		<div class="command-metric">
			<span class="command-metric-label">{label}</span>
			<span class="command-metric-value">{value}</span>
		</div>
	</vigil.Panel>
{/snippet}

<div class="app-page-content vigil-deck-page goals-modern-page">
	<vigil.ModernPageHeader title="Financial goals">
		{#snippet actions()}
			<NativeButton
				class="btn-primary"
				disabled={atGoalLimit(vm.overview)}
				data-guide="goal-create"
				onclick={() => (createOpen = true)}>New goal</NativeButton
			>
		{/snippet}
	</vigil.ModernPageHeader>
	{#if vm.notice}
		<div class="mt-5 rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
			{vm.notice}
		</div>
	{/if}
	{#if vm.errorMessage}
		<div class="mt-5"><FormErrorBanner message={vm.errorMessage} /></div>
	{/if}
	<vigil.CommandDeck class="is-3col mt-8">
		{@render goalMetricPanel(
			'Current value',
			money(vm.overview.totalCurrentValue, firstCurrency(vm))
		)}
		{@render goalMetricPanel(
			'Combined targets',
			money(vm.overview.totalTargetAmount, firstCurrency(vm))
		)}
		{@render goalMetricPanel('Active goals', activeCount(vm.overview))}
	</vigil.CommandDeck>
	{#if atGoalLimit(vm.overview)}
		<p class="mt-4 text-sm text-muted-foreground">
			Free includes one active deterministic goal. Pro adds unlimited goals, bulk planning, exports,
			and linked budget or rebalance drafts.
		</p>
	{/if}
	{#if items.length === 0}
		<div class="mt-8">
			<EmptyState
				title="Build your first financial plan"
				description="Set a target, timeline, contribution, and risk profile. Every calculation remains visible and deterministic."
				actionLabel="Create a goal"
				actionHref="#new-goal"
			/>
		</div>
	{:else}
		<form class="mt-8" method="POST" action="?/bulk" use:enhance={withSpinner()}>
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-lg font-semibold">Your goals</h2>
				<div class="flex gap-2">
					<!-- Go renders these through NativeButton without a Type, i.e. type="button",
					     so neither submits the form. Ported as-is; see docs/parity. -->
					<NativeButton class="btn-secondary text-sm" name="status" value="paused"
						>Pause selected</NativeButton
					><NativeButton class="btn-secondary text-sm" name="status" value="active"
						>Activate selected</NativeButton
					>
				</div>
			</div>
			<div class="grid gap-4 lg:grid-cols-2">
				{#each items as item (item.id)}
					<GoalCard {item} selected={vm.selected?.id === item.id} />
				{/each}
			</div>
		</form>
	{/if}
	{#if vm.selected}
		{#key vm.selected.id}
			<GoalDetail item={vm.selected} suggestions={vm.suggestions} />
		{/key}
	{/if}
	<!-- x-show="createOpen" x-cloak: kept in the DOM, hidden with display:none. -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="portfolio-modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		style:display={createOpen ? null : 'none'}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-labelledby="new-goal-title"
		onclick={(e) => {
			// x-on:click.outside on the panel
			if (e.target === e.currentTarget) createOpen = false;
		}}
	>
		<div
			class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-[var(--color-card-bg)] p-6 shadow-2xl"
		>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-footnote font-semibold text-muted-foreground">Deterministic plan</p>
					<h2 id="new-goal-title" class="mt-2 text-2xl font-semibold">Create a financial goal</h2>
				</div>
				<NativeButton class="btn-ghost" onclick={() => (createOpen = false)}>Close</NativeButton>
			</div>
			<CreateForm portfolios={vm.portfolios} onsubmitted={() => (createOpen = false)} />
		</div>
	</div>
</div>
