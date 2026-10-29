<script lang="ts">
	// expenses.CategoryPage + CategoryExpenseRow (internal/pages/expenses/category.templ).
	import { goto } from '$app/navigation';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { EmptyState, NativeButton, SectionCard, StatPill } from '#lib/components/norviq/index.js';
	import { formatFloat } from '#lib/format.js';

	let { data } = $props();

	// hx-delete + hx-confirm → DELETE /expenses/{id} (owned by the planner
	// port), which answers 204 with x-redirect (Go's HX-Redirect).
	async function deleteExpense(id: string) {
		if (!confirm('Delete this expense?')) return;
		const url = `/expenses/${id}?month=${data.monthQuery}&pillar=${data.pillarKey.toLowerCase()}`;
		const res = await fetch(url, { method: 'DELETE' });
		if (res.ok) await goto(res.headers.get('x-redirect') ?? location.href, { invalidateAll: true });
	}
</script>

<svelte:head>
	<title>{data.pillarLabel} - Expenses - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-canvas-page expenses-category-page expenses-modern-page">
	<a href={data.backURL} class="vigil-settings-back">← Back to planner</a>
	<vigil.ModernPageHeader title={data.pillarLabel} subtitle={data.monthLabel} />
	<vigil.CommandSplit>
		<vigil.CommandSplitMain>
			<vigil.Panel class="rounded-lg p-6" titleID="category-expenses-panel">
				<SectionCard title="Expenses in this pillar">
					{#if data.expenses.length === 0}
						<EmptyState title="The ledger is quiet" description="Recorded spending in this pillar will show up here." />
					{:else}
						<ul class="expenses-category-list vigil-dense-list mt-4 space-y-2">
							{#each data.expenses as row (row.id)}
								<li class="expenses-category-row glass-card p-4 flex items-center justify-between gap-4">
									<div>
										<p class="font-semibold">{row.title}</p>
										<p class="text-xs text-muted-foreground">{row.date}</p>
									</div>
									<div class="flex items-center gap-3">
										<p class="font-semibold tabular-nums">{row.amount}</p>
										<NativeButton
											class="expenses-delete-btn text-xs font-semibold text-muted-foreground hover:opacity-100"
											onclick={() => deleteExpense(row.id)}
										>
											Delete
										</NativeButton>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</SectionCard>
			</vigil.Panel>
		</vigil.CommandSplitMain>
		<vigil.CommandSplitAside>
			<vigil.Panel class="rounded-lg p-5" titleID="category-stats-panel">
				<p class="command-metric-label">Pillar budget</p>
				<div class="mt-4 grid gap-3">
					<StatPill label="Planned" value={data.planned} />
					<StatPill label="Spent" value={data.spent} />
					<StatPill label="Remaining" value={data.remaining} />
				</div>
				<div class="pillar-progress mt-5 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
					<div class="pillar-progress-fill h-full rounded-full" style={`width:${formatFloat(data.progressPct, 0)}%`}></div>
				</div>
			</vigil.Panel>
		</vigil.CommandSplitAside>
	</vigil.CommandSplit>
</div>
