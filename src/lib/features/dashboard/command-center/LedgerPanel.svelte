<script lang="ts">
	// dashboard.LedgerPanel / LedgerBody: the LEDGER rail. Domain chips fetch
	// /dashboard/ledger (JSON) and swap only this panel, as the hx-get did; the
	// href stays the Go fragment URL.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import EmptyStateInline from '#lib/components/norviq/EmptyStateInline.svelte';
	import { Path } from '#lib/nav.js';
	import type { LedgerDayVM, LedgerFilterVM, LedgerVM } from './types.js';

	let { ledger }: { ledger: LedgerVM } = $props();
	let swapped = $state<LedgerVM | null>(null);
	const vm = $derived(swapped ?? ledger);

	async function pick(e: MouseEvent, f: LedgerFilterVM) {
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
		e.preventDefault();
		const res = await fetch(f.href, { headers: { accept: 'application/json' } });
		if (res.ok) swapped = (await res.json()) as LedgerVM;
	}
</script>

{#snippet ledgerDay(day: LedgerDayVM)}
	<section class="cc-ledger-day">
		<h3 class="cc-ledger-day-label">{day.label}</h3>
		<ul class="cc-ledger-list">
			{#each day.items as item, i (i)}
				<li class="cc-ledger-row" data-tone={item.iconTone} data-domain={item.domain}>
					<span class="cc-ledger-badge">{item.badgeLabel}</span>
					{#if item.href}
						<a class="cc-ledger-copy" href={item.href}>
							<span class="cc-ledger-title">{item.title}</span>
							{#if item.subtitle}
								<span class="cc-ledger-subtitle">{item.subtitle}</span>
							{/if}
						</a>
					{:else}
						<span class="cc-ledger-copy">
							<span class="cc-ledger-title">{item.title}</span>
							{#if item.subtitle}
								<span class="cc-ledger-subtitle">{item.subtitle}</span>
							{/if}
						</span>
					{/if}
					{#if item.hasAmount}
						<span class="cc-ledger-amount" data-direction={item.amountPositive ? 'up' : 'down'}>
							{item.amount}
						</span>
					{/if}
					<time class="cc-ledger-time">{item.timestamp}</time>
				</li>
			{/each}
		</ul>
	</section>
{/snippet}

<div id="cc-ledger">
	<vigil.Panel class="cc-ledger-panel" titleID="cc-ledger-title">
		<div class="cc-panel-head">
			<div class="cc-panel-head-copy">
				<h2 id="cc-ledger-title" class="cc-panel-title">Ledger · {vm.rangeLabel}</h2>
			</div>
			<a class="cc-panel-link" href="/dashboard/activity">Open full activity</a>
		</div>
		{#if vm.ledgerFilters.length > 0}
			<nav class="cc-ledger-filters" aria-label="Filter ledger by domain">
				{#each vm.ledgerFilters as f (f.key)}
					<a
						href={f.href}
						class="cc-ledger-filter"
						data-active={f.active ? 'true' : 'false'}
						aria-current={f.active ? 'true' : undefined}
						data-sveltekit-preload-data="off"
						onclick={(e) => pick(e, f)}
					>
						{f.label}
					</a>
				{/each}
			</nav>
		{/if}
		{#if vm.loadError}
			<EmptyStateInline
				title="Ledger unavailable"
				description="We could not load your activity just now. Everything else on this page still loaded."
			/>
		{:else if vm.ledger.length === 0}
			<EmptyStateInline
				title="The ledger is quiet."
				description="No portfolio or spending activity in this window. Log your first expense, or try a wider range."
				actionLabel="Log an expense"
				actionHref={Path.Expenses}
			/>
		{:else}
			<div class="cc-ledger-days">
				{#each vm.ledger as day, i (i)}
					{@render ledgerDay(day)}
				{/each}
			</div>
		{/if}
	</vigil.Panel>
</div>
