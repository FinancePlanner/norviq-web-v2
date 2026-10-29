<script lang="ts">
	// Port of expenses.PlannerPage (internal/pages/expenses/planner.templ +
	// command_deck.templ). The htmx modal (#expense-action-dialog, panels loaded
	// by hx-get into #expense-action-panel) is a native dialog whose panel is the
	// fragment route's component, fed by preloadData().
	import { enhance } from '$app/forms';
	import { preloadData } from '$app/navigation';
	import type { Component } from 'svelte';
	import EChart from '#lib/charts/EChart.svelte';
	import { allocationPie } from '#lib/charts/index.js';
	import {
		CardHeader,
		CheckboxField,
		EmptyState,
		Field,
		FormErrorBanner,
		Icon,
		ListSkeleton,
		NativeButton,
		NativeInput,
		PrimaryButton,
		ProGateOverlay,
		SecondarySubmitButton,
		SelectField,
		SubmitButton,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import * as dialog from '#lib/components/norviq/tui/dialog/index.js';
	import { staggerOnMount } from '#lib/motion.js';
	import { formatFloat } from '#lib/format.js';
	import { resolvePillar } from '#lib/features/money/pillars.js';
	import { PANEL_CLOSE_EVENT } from '#lib/features/money/expenses/panel.js';
	import { destinationGoalOptions, destinationPortfolioOptions, type PlannerViewModel } from '#lib/features/money/expenses/vm.js';
	import RecordExpensePanel from '#lib/features/money/expenses/panels/RecordExpensePanel.svelte';
	import SalaryPanel from '#lib/features/money/expenses/panels/SalaryPanel.svelte';
	import PartnerPanel from '#lib/features/money/expenses/panels/PartnerPanel.svelte';
	import PlanItemPanel from '#lib/features/money/expenses/panels/PlanItemPanel.svelte';
	import CategoryPanel from '#lib/features/money/expenses/panels/CategoryPanel.svelte';
	import RecurringTemplatePanel from '#lib/features/money/expenses/panels/RecurringTemplatePanel.svelte';
	import ReceiptImportPanel from '#lib/features/money/receipts/ReceiptImportPanel.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const vm: PlannerViewModel = $derived(data.vm);
	const isPro = $derived(vm.isPro);

	const donut = $derived(vm.donut ? allocationPie('expenses-donut-chart', ['Spent', 'Remaining'], [vm.donut.spent, vm.donut.remaining]) : null);

	// ---- the expense action dialog ----
	type PanelState =
		| { kind: 'loading' }
		| { kind: 'panel'; component: Component<{ vm: never }>; vm: unknown }
		| { kind: 'receipts'; data: unknown }
		| { kind: 'gate'; name: string }
		| { kind: 'error'; message: string };

	let dialogOpen = $state(false);
	let panel = $state<PanelState>({ kind: 'loading' });
	let panelSeq = 0;

	const PANELS: Record<string, Component<{ vm: never }>> = {
		record: RecordExpensePanel as unknown as Component<{ vm: never }>,
		salary: SalaryPanel as unknown as Component<{ vm: never }>,
		partner: PartnerPanel as unknown as Component<{ vm: never }>,
		'plan-item': PlanItemPanel as unknown as Component<{ vm: never }>,
		category: CategoryPanel as unknown as Component<{ vm: never }>,
		recurring: RecurringTemplatePanel as unknown as Component<{ vm: never }>
	};

	/** hx-get=href hx-target=#expense-action-panel + data-tui-dialog-trigger. */
	async function openPanel(href: string, gate?: { feature?: string; name: string }) {
		const seq = ++panelSeq;
		dialogOpen = true;
		// Go's RequireFeature answered htmx with the ProGateOverlay fragment.
		if (gate && gate.feature && data.features && !data.features[gate.feature]) {
			panel = { kind: 'gate', name: gate.name };
			return;
		}
		panel = { kind: 'loading' };
		const result = await preloadData(href);
		if (seq !== panelSeq) return;
		if (result.type === 'redirect') {
			window.location.assign(result.location);
			return;
		}
		if (result.type === 'error') {
			const err = result.error as { proGate?: string; message?: string };
			if (result.status === 402) panel = { kind: 'gate', name: err?.proGate ?? gate?.name ?? 'Norviq Pro' };
			else panel = { kind: 'error', message: err?.message || 'Failed to render form' };
			return;
		}
		const pageData = result.data as { vm?: unknown; state?: unknown };
		if (result.status >= 400 || (!pageData.vm && !pageData.state)) {
			panel = { kind: 'error', message: 'Failed to render form' };
			return;
		}
		const key = new URL(href, location.href).pathname.split('/')[2] ?? '';
		if (key === 'receipt') panel = { kind: 'receipts', data: { state: pageData.state } };
		else panel = { kind: 'panel', component: PANELS[key], vm: pageData.vm };
	}

	$effect(() => {
		const close = () => (dialogOpen = false);
		window.addEventListener(PANEL_CLOSE_EVENT, close);
		return () => window.removeEventListener(PANEL_CLOSE_EVENT, close);
	});

	// ---- reallocation simulator (Alpine x-data monthly/annual) ----
	let driftPanel = $state<HTMLElement | null>(null);
	let monthly = $state(0);
	const annual = $derived(monthly * 12);
	function recalc() {
		if (!driftPanel) return;
		monthly = Array.from(driftPanel.querySelectorAll<HTMLInputElement>('[data-reallocation]')).reduce(
			(sum, input) => sum + (Number(input.value) || 0),
			0
		);
	}
	$effect(() => {
		if (driftPanel) recalc();
	});
	const money = (v: number, ccy: string) => {
		try {
			return v.toLocaleString(undefined, { style: 'currency', currency: ccy });
		} catch {
			return String(v);
		}
	};
	let destinationPortfolio = $state<HTMLSelectElement | null>(null);

	// ---- activity filter (Alpine x-data { q, pillar }) ----
	let q = $state('');
	let pillarFilter = $state('');

	// ---- suggestions: dismissed cards drop out (Go: outerHTML swap with nothing) ----
	let dismissed = $state<string[]>([]);

	const expensesAITagStyle = (pillar: string) =>
		!pillar.trim() ? '--pillar-color: var(--muted-foreground)' : `--pillar-color: var(${resolvePillar(pillar).colorVar})`;
	const expensesAITagLabel = (pillar: string) => (!pillar.trim() ? 'Untagged' : resolvePillar(pillar).label);
	const fmtDeployPct = (pct: number) => (pct < 8 ? '8%' : formatFloat(pct, 0) + '%');
	const pillarStyle = (colorVar: string) => `--pillar-color: var(${colorVar || '--color-tint'})`;
	const actionMessage = $derived((form as { message?: string } | null)?.message ?? '');
</script>

<svelte:head>
	<title>Budget planner - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet headerActions()}
	<a class="btn-secondary inline-flex" href="/expenses/import">Import spreadsheet</a>
	<NativeButton class="btn-secondary inline-flex" onclick={() => openPanel('/expenses/receipt/import', { feature: 'receipt_scan', name: 'Receipt scanning' })}>
		Scan receipts
	</NativeButton>
	<PrimaryButton href="/expenses/financing" class="inline-flex">Plan a purchase</PrimaryButton>
	<div class="flex flex-wrap gap-2">
		<a href={vm.prevMonthURL} class="btn-secondary px-4 py-2 text-sm">Previous month</a>
		<a href={vm.nextMonthURL} class="btn-secondary px-4 py-2 text-sm">Next month</a>
		<NativeButton class="btn-secondary px-4 py-2 text-sm" onclick={() => openPanel('/expenses/partner', { feature: 'household_partner', name: 'Household partner' })}>
			Partner
			{#if !isPro}
				<span class="stock-pro-badge">Pro</span>
			{/if}
		</NativeButton>
		<NativeButton class="btn-primary w-auto px-5 py-2 text-sm" onclick={() => openPanel('/expenses/record?month=' + vm.monthQuery)}>Record spend</NativeButton>
	</div>
{/snippet}

{#snippet usedDelta()}
	{#if vm.spentPct > 0}
		<vigil.HeroDelta text={`${formatFloat(vm.spentPct, 0)}% used`} sentiment={vm.spentPct > 100 ? 'negative' : ''} />
	{/if}
{/snippet}

{#snippet pillarMetric(label: string, value: string, tone: string)}
	<div class="pillar-metric">
		<span class="command-metric-label">{label}</span>
		<span class={['command-metric-value', tone]}>{value}</span>
	</div>
{/snippet}

<div class="app-page-content vigil-deck-page expenses-planner-page expenses-modern-page">
	<vigil.ModernPageHeader title="Budget planner" subtitle={vm.monthLabel} actions={headerActions} />
	{#if vm.hasLoadError}
		<div class="glass-card p-6" role="alert">
			<p class="font-semibold">Could not load budget data</p>
			<p class="mt-2 text-sm text-muted-foreground">{vm.errorMessage}</p>
		</div>
	{/if}
	<FormErrorBanner message={actionMessage} />
	<vigil.Hero label="Spent this month" value={vm.spentTotal} delta={usedDelta}>
		<p class="text-subhead text-muted-foreground">{vm.spentTotal} of {vm.plannedTotal} planned</p>
		<div class="expenses-budget-meta">
			{#if donut}
				<div class="expenses-donut overview-chart-wrap">
					<EChart {...donut} />
				</div>
			{/if}
			<NativeButton
				class="expenses-budget-salary command-metric"
				data-guide="budget-salary"
				onclick={() => openPanel('/expenses/salary?month=' + vm.monthQuery)}
			>
				<span class="command-metric-label">Net salary</span>
				<span class="command-metric-value" data-format="$">{vm.salary}</span>
				<span class="text-footnote text-muted-foreground">Edit salary and pillar targets</span>
			</NativeButton>
			{#if vm.hasPartner}
				<div class="expenses-budget-partner command-metric">
					<span class="command-metric-label">Household partner</span>
					<span class="command-metric-value">{vm.partnerName}</span>
				</div>
			{/if}
		</div>
	</vigil.Hero>

	{#if vm.drift}
		{@const drift = vm.drift}
		<section id="budget-drift-panel" class="glass-card p-6" aria-labelledby="budget-drift-title" bind:this={driftPanel}>
			<div class="modern-section-heading">
				<div>
					<p class="tabular-nums text-footnote text-muted-foreground">DCA capacity · surplus monitor</p>
					<h2 id="budget-drift-title">Investable capacity</h2>
					<p>Actual spending against targets — surplus feeds deploy capacity.</p>
				</div>
				<span class={'rounded-full px-3 py-1 text-xs font-semibold budget-status-' + drift.level}>{drift.levelLabel}</span>
			</div>
			<div class="grid gap-4 md:grid-cols-4">
				<div><p class="field-label">Actual / target</p><p class="font-semibold tabular-nums">{drift.totalActual} / {drift.totalTarget}</p></div>
				<div><p class="field-label">Drift</p><p class="font-semibold tabular-nums">{drift.driftAmount} · {drift.driftPercent}</p></div>
				<div><p class="field-label">Investment target</p><p class="font-semibold tabular-nums">{drift.investmentTarget}</p></div>
				<div><p class="field-label">Capital lost this month</p><p class="font-semibold tabular-nums">{drift.lostCapital}</p></div>
			</div>
			{#if vm.discipline}
				<div class="mt-4 grid gap-3 rounded-lg bg-black/5 p-4 sm:grid-cols-3 dark:bg-white/5">
					<div><p class="field-label">Discipline score</p><p class="font-semibold">{vm.discipline.score}</p></div>
					<div><p class="field-label">Completed streak</p><p class="font-semibold">{vm.discipline.streak}</p></div>
					<div><p class="field-label">Within plan</p><p class="font-semibold">{vm.discipline.compliance}</p></div>
				</div>
			{/if}
			{#if vm.alertPolicy}
				<details class="mt-4 rounded-lg bg-black/5 p-4 dark:bg-white/5">
					<summary class="cursor-pointer font-semibold">Drift alert policy</summary>
					<form method="POST" action="?/alertPolicy" class="mt-4 grid gap-4 sm:grid-cols-2" use:enhance={withSpinner()}>
						<input type="hidden" name="snapshot_id" value={drift.snapshotID} />
						<input type="hidden" name="month" value={vm.monthQuery} />
						<Field name="category_threshold" label="Category threshold (%)" type="number" value={vm.alertPolicy.categoryThreshold} required min="0" max="1000" step="0.1" />
						<Field name="total_threshold" label="Total budget threshold (%)" type="number" value={vm.alertPolicy.totalThreshold} required min="0" max="1000" step="0.1" />
						<CheckboxField name="alerts_enabled" label="Enable drift alerts" value="true" checked={vm.alertPolicy.alertsEnabled} />
						<CheckboxField name="alert_on_unbudgeted" label="Alert on unbudgeted spending" value="true" checked={vm.alertPolicy.alertOnUnbudgeted} />
						<div class="sm:col-span-2">
							<SecondarySubmitButton>Save alert policy</SecondarySubmitButton>
						</div>
					</form>
				</details>
			{/if}
			<div class="mt-5 overflow-x-auto">
				<table class="expenses-plan-table">
					<thead><tr><th>Category</th><th>Status</th><th>Actual</th><th>Target</th><th>Drift</th></tr></thead>
					<tbody>
						{#each drift.categories as row (row.id)}
							<tr
								><td class="font-semibold">{row.title}</td><td
									><span class={'budget-status-inline budget-status-' + row.level}>{row.levelLabel}</span></td
								><td class="tabular-nums">{row.actual}</td><td class="tabular-nums">{row.target}</td><td class="tabular-nums"
									>{row.drift} · {row.driftPercent}</td
								></tr
							>
						{/each}
					</tbody>
				</table>
			</div>
			{#if drift.hasSuggestions}
				<div class="mt-6 border-t border-black/10 pt-5 dark:border-white/10">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<h3 class="font-semibold">Next-month reallocation simulator</h3>
							<p class="text-sm text-muted-foreground">Move spending targets into Investments. No money is transferred and no trade is placed.</p>
						</div>
						{#if !isPro}
							<span class="stock-pro-badge">Pro</span>
						{/if}
					</div>
					{#if isPro}
						<form method="POST" action="?/reallocation" class="mt-4 space-y-4" oninput={recalc} use:enhance={withSpinner()}>
							<input type="hidden" name="snapshot_id" value={drift.snapshotID} />
							<input type="hidden" name="revision" value={String(drift.revision)} />
							<input type="hidden" name="month" value={vm.monthQuery} />
							{#if vm.financialGoals.length > 0 || vm.portfolioLists.length > 0}
								<div class="grid gap-4 rounded-lg border border-black/10 p-4 sm:grid-cols-2 dark:border-white/10">
									<SelectField name="portfolio_list_id" label="Investment portfolio" options={destinationPortfolioOptions(vm.portfolioLists)} bind:ref={destinationPortfolio} />
									<SelectField
										name="financial_goal_id"
										label="Financial goal"
										options={destinationGoalOptions(vm.financialGoals)}
										onchange={(e: Event) => {
											const p = (e.currentTarget as HTMLSelectElement).selectedOptions[0]?.dataset.portfolio;
											if (p && destinationPortfolio) destinationPortfolio.value = p;
										}}
									/>
									<p class="text-xs text-muted-foreground sm:col-span-2">Selecting a goal also routes the contribution forecast to that goal’s portfolio.</p>
								</div>
							{/if}
							{#each drift.categories as row (row.id)}
								{#if row.eligible}
									<label class="block rounded-lg bg-black/5 p-4 dark:bg-white/5">
										<span class="flex justify-between gap-3 text-sm"
											><span class="font-semibold">{row.title}</span><span>{row.suggestedCutLabel} suggested</span></span
										>
										<NativeInput
											name={'cut_' + row.id}
											type="range"
											value={formatFloat(row.suggestedCut, 2)}
											class="mt-3 w-full"
											data-reallocation={true}
											min="0"
											max={formatFloat(row.suggestedCut, 2)}
											step="1"
											aria-label={'Reduce ' + row.title + ' next month'}
										/>
									</label>
								{/if}
							{/each}
							<div class="flex flex-wrap items-center justify-between gap-3">
								<p class="text-sm">
									<strong>{money(monthly, drift.currencyCode)}</strong> monthly · <strong>{money(annual, drift.currencyCode)}</strong> annual runway
								</p>
								<SubmitButton>Commit for next month</SubmitButton>
							</div>
						</form>
					{:else}
						<a class="btn-secondary mt-4 inline-flex" href="/settings/subscription">Unlock simulator</a>
					{/if}
				</div>
			{/if}
			<div class="mt-5 flex flex-wrap gap-3">
				<a class="btn-secondary inline-flex" href={'/expenses/report.pdf?month=' + vm.monthQuery} data-sveltekit-reload>
					Monthly PDF report
					{#if !isPro}
						<span class="stock-pro-badge">Pro</span>
					{/if}
				</a>
				<a class="btn-secondary inline-flex" href="/expenses/year">
					Historical trends
					{#if !isPro}
						<span class="stock-pro-badge">Pro</span>
					{/if}
				</a>
			</div>
			{#if isPro}
				<div class="mt-6 border-t border-black/10 pt-5 dark:border-white/10">
					<h3 class="font-semibold">Budget templates</h3>
					<div class="mt-3 flex flex-wrap gap-2">
						<form method="POST" action="?/templates" class="flex gap-2" use:enhance={withSpinner()}>
							<input type="hidden" name="snapshot_id" value={drift.snapshotID} />
							<input type="hidden" name="month" value={vm.monthQuery} />
							<Field name="name" placeholder="Template name" required maxlength={80} aria-label="Template name" />
							<SecondarySubmitButton>Save current targets</SecondarySubmitButton>
						</form>
						{#each vm.templates as template (template.id)}
							<form
								method="POST"
								action="?/templateApply"
								use:enhance={withSpinner()}
								onsubmit={(e) => {
									if (!confirm('Replace this month’s target items with the selected template? Recorded expenses will not be changed.')) e.preventDefault();
								}}
							>
								<input type="hidden" name="template_id" value={template.id} />
								<input type="hidden" name="snapshot_id" value={drift.snapshotID} />
								<input type="hidden" name="revision" value={String(drift.revision)} />
								<input type="hidden" name="month" value={vm.monthQuery} />
								<input type="hidden" name="replace_existing" value="true" />
								<SecondarySubmitButton>Apply {template.name}</SecondarySubmitButton>
							</form>
						{/each}
					</div>
				</div>
				{#if vm.reallocations.length > 0}
					<div class="mt-5">
						<h3 class="font-semibold">Recent reallocations</h3>
						<ul class="mt-2 space-y-2">
							{#each vm.reallocations as event, i (i)}
								<li class="flex justify-between rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/5">
									<span>{event.effectiveMonth}</span><strong>{event.freedCapital} to Investments</strong>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/if}
		</section>
	{/if}

	<div class="expenses-pillars" {@attach staggerOnMount(':scope > *', 40)}>
		{#each vm.pillars as pillar (pillar.key)}
			<a href={pillar.detailURL} class="pillar-card glass-card" style={pillarStyle(pillar.colorVar)}>
				<div class="pillar-card-header">
					<span class="pillar-card-glyph" aria-hidden="true">
						<Icon name={pillar.icon || 'layers'} class="h-5 w-5" />
					</span>
					<span class="pillar-card-heading">
						<span class="pillar-card-title">{pillar.label}</span>
						<span class="pillar-card-subtitle">{pillar.hint}</span>
					</span>
				</div>
				<div class="pillar-card-metrics">
					{@render pillarMetric('Goal', pillar.target, '')}
					{@render pillarMetric('Planned', pillar.planned, '')}
					{@render pillarMetric('Actual', pillar.spent, '')}
					{#if pillar.hasTarget}
						{@render pillarMetric('Left', pillar.left, pillar.overspent ? 'is-negative' : 'is-positive')}
					{:else}
						{@render pillarMetric('Left', '--', '')}
					{/if}
				</div>
				{#if pillar.hasTarget}
					<p class="pillar-card-progress-label">{pillar.progressLabel}</p>
					<div class="pillar-progress">
						<div class={['pillar-progress-fill', 'is-' + pillar.progressState]} style={`width:${formatFloat(pillar.progressPct, 0)}%`}></div>
					</div>
				{:else}
					<p class="pillar-card-progress-label">No goal set</p>
				{/if}
			</a>
		{/each}
	</div>

	<section class="expenses-plan-panel">
		<div class="modern-section-heading">
			<div>
				<h2>Plan items</h2>
				<p>Line-item budgets within each pillar.</p>
			</div>
			<NativeButton class="btn-primary w-auto px-5 py-2 text-sm" onclick={() => openPanel('/expenses/plan-item?month=' + vm.monthQuery)}>Add item</NativeButton>
			{#if isPro && vm.drift}
				<a class="btn-secondary w-auto px-5 py-2 text-sm" href={'/expenses/bulk?month=' + vm.monthQuery}>Bulk edit</a>
			{/if}
		</div>
		{#if vm.planItems.length === 0}
			<p class="modern-empty-copy">No plan items yet. Add rent, subscriptions, or savings targets.</p>
		{:else}
			<div class="expenses-plan-table-wrap">
				<table class="expenses-plan-table">
					<thead>
						<tr>
							<th>Item</th>
							<th>Category</th>
							<th>Planned</th>
							<th><span class="sr-only">Actions</span></th>
						</tr>
					</thead>
					<tbody>
						{#each vm.planItems as item (item.id)}
							<tr>
								<td><p class="font-semibold">{item.title}</p></td>
								<td>{item.pillar}</td>
								<td class="tabular-nums">{item.planned}</td>
								<td class="text-right">
									<NativeButton class="btn-secondary px-3 py-1 text-xs" onclick={() => openPanel(`/expenses/plan-item/${item.id}?month=${vm.monthQuery}`)}>Edit</NativeButton>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- CommandDeck (command_deck.templ) -->
	<vigil.CommandDeck class="is-3col expenses-command-deck">
		<div class="glass-card dash-panel expenses-deck-panel">
			<p class="deck-panel-title">Monthly expenses · AI categorized</p>
			{#if vm.activity.length === 0}
				<p class="text-sm text-muted-foreground">No spending logged this month.</p>
			{:else}
				<vigil.DataTable class="mt-2">
					<thead>
						<tr>
							<th>Date</th>
							<th>Merchant</th>
							<th>Amount</th>
							<th>Tag</th>
						</tr>
					</thead>
					<tbody>
						{#each vm.activity.slice(0, 8) as item (item.id)}
							<tr>
								<td class="text-footnote text-muted-foreground tabular-nums">{item.date}</td>
								<td>{item.title}</td>
								<td class="expenses-deck-amount">{item.amount}</td>
								<td><span class="expenses-ai-tag" style={expensesAITagStyle(item.pillar)}>{expensesAITagLabel(item.pillar)}</span></td>
							</tr>
						{/each}
					</tbody>
				</vigil.DataTable>
			{/if}
		</div>

		<div id="expenses-dca-panel" class="glass-card dash-panel expenses-deck-panel expenses-dca-panel">
			<p class="deck-panel-title">This month in {vm.capacity?.symbol || 'your ticker'}</p>
			{#if vm.capacity}
				<p class="expenses-dca-hero">{vm.capacity.hero}</p>
				<p class="text-center text-xs text-muted-foreground">{vm.capacity.priceLine}</p>
				{#if vm.capacity.overspend.length > 0}
					<ul class="mt-3 space-y-1 text-xs text-muted-foreground">
						{#each vm.capacity.overspend as row, i (i)}
							<li><span class="font-medium">{row.title}</span> · {row.line}</li>
						{/each}
					</ul>
				{/if}
				<form class="mt-3 flex items-end gap-2" method="POST" action="?/dcaTicker" use:enhance={withSpinner()}>
					<input type="hidden" name="month" value={vm.monthQuery} />
					<div class="min-w-0 flex-1">
						<Field name="symbol" label="DCA ticker" value={vm.capacity.symbol} placeholder="VWCE" class="tabular-nums" maxlength={12} autocomplete="off" />
					</div>
					<SubmitButton class="btn-primary !w-auto shrink-0 px-3">Set ticker</SubmitButton>
				</form>
				<p class="mt-2 text-center text-caption text-muted-foreground">{vm.capacity.disclaimer}</p>
				{#if vm.drift && vm.drift.hasSuggestions && isPro}
					<PrimaryButton href="#budget-drift-panel" class="mt-auto text-center">Review reallocation</PrimaryButton>
				{/if}
			{:else if vm.drift}
				<p class="expenses-dca-hero">+{vm.drift.surplusReady} leftover</p>
				<div class="expenses-dca-gauge" style={` --dca-pct: ${fmtDeployPct(vm.drift.deployPct)};`}>
					<div class="expenses-dca-gauge-fill"></div>
				</div>
				<p class="text-center text-xs text-muted-foreground">Deployment target · {vm.drift.investmentTarget}</p>
			{:else}
				<p class="text-sm text-muted-foreground">Set salary and pillar targets to calculate leftover cash as units of a holding.</p>
				<NativeButton class="btn-primary mt-auto w-full" onclick={() => openPanel('/expenses/salary?month=' + vm.monthQuery)}>Set up budget</NativeButton>
			{/if}
		</div>

		<!-- TaxTeaserShell → TaxTeaserCard (Go: hx-get /expenses/tax-teaser on load) -->
		{#await data.taxTeaser}
			<div id="expenses-tax-teaser" class="glass-card dash-panel expenses-deck-panel expenses-tax-teaser">
				<p class="deck-panel-title">Tax liability forecaster</p>
				<p class="text-sm text-muted-foreground">Loading estimates…</p>
			</div>
		{:then tax}
			<div id="expenses-tax-teaser" class="glass-card dash-panel expenses-deck-panel expenses-tax-teaser">
				<p class="deck-panel-title">Tax liability forecaster</p>
				{#if tax.loadError}
					<p class="text-sm text-muted-foreground">Tax estimates unavailable.</p>
					<a href="/tax" class="link-tint mt-auto text-subhead font-semibold">Open tax strategy</a>
				{:else if !tax.hasData}
					<p class="text-sm text-muted-foreground">Complete your tax profile to see jurisdiction-aware estimates.</p>
					<a href="/tax" class="link-tint mt-auto text-subhead font-semibold">Set up tax profile</a>
				{:else}
					<p class="text-xs text-muted-foreground">Jurisdiction · {tax.jurisdiction} · {tax.taxYear}</p>
					<div class="expenses-tax-teaser-chart mt-2 space-y-2">
						{#if tax.estimatedDrag}
							<p><span class="text-muted-foreground">Est. tax drag</span> <span class="expenses-deck-amount">{tax.estimatedDrag}</span></p>
						{/if}
						{#if tax.netBenefit}
							<p><span class="text-muted-foreground">Potential net benefit</span> <span class="expenses-deck-amount is-credit">{tax.netBenefit}</span></p>
						{/if}
					</div>
					{#if tax.optimization}
						<p class="text-xs mt-2 text-[var(--color-success)]">{tax.optimization}</p>
					{/if}
					<a href="/tax" class="link-tint mt-auto text-subhead font-semibold">Full tax dashboard</a>
				{/if}
			</div>
		{/await}
	</vigil.CommandDeck>

	<div class="vigil-list-region">
		<section>
			<CardHeader title="Categories" />
			<div id="expenses-categories-body">
				<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
					<p class="text-sm text-muted-foreground">Labels like groceries or subscriptions for your spending.</p>
					<NativeButton class="btn-secondary px-4 py-2 text-sm" onclick={() => openPanel('/expenses/category?month=' + vm.monthQuery)}>Add category</NativeButton>
				</div>
				{#if vm.categories.length === 0}
					<p class="mt-4 text-sm text-muted-foreground">No categories yet. Add custom labels or use the defaults when recording spend.</p>
				{:else}
					<ul class="expenses-plan-list mt-3" {@attach staggerOnMount(':scope > li', 30)}>
						{#each vm.categories as item (item.id)}
							<li class="expenses-plan-row">
								<div class="min-w-0 flex-1">
									<p class="font-semibold truncate">{item.name}</p>
									<p class="text-xs text-muted-foreground">
										{#if item.isDefault}Default · {item.pillarLabel}{:else}{item.pillarLabel}{/if}
									</p>
								</div>
								{#if item.canDelete}
									<form
										method="POST"
										action="?/deleteCategory"
										class="contents"
										use:enhance={withSpinner()}
										onsubmit={(e) => {
											if (!confirm('Delete this category?')) e.preventDefault();
										}}
									>
										<input type="hidden" name="id" value={item.id} />
										<NativeButton type="submit" data-nq-submit={undefined} class="btn-secondary px-3 py-1 text-xs text-[var(--color-danger)]">Delete</NativeButton>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
		<section>
			<CardHeader title="Recurring" />
			<div id="expenses-recurring-body">
				<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
					<p class="text-sm text-muted-foreground">Templates for rent, subscriptions, and other repeat spend.</p>
					<NativeButton
						class="btn-secondary px-4 py-2 text-sm"
						onclick={() => openPanel('/expenses/recurring?month=' + vm.monthQuery, { feature: 'recurring_templates', name: 'Recurring templates' })}
					>
						Add recurring
						{#if !isPro}
							<span class="stock-pro-badge">Pro</span>
						{/if}
					</NativeButton>
				</div>
				{#if !isPro}
					<p class="mt-4 text-sm text-muted-foreground">Upgrade to Pro to save recurring expense templates and log them in one tap.</p>
				{:else if vm.recurring.length === 0}
					<p class="mt-4 text-sm text-muted-foreground">No recurring templates yet. Add rent, subscriptions, or other repeat expenses.</p>
				{:else}
					<ul class="expenses-plan-list mt-3" {@attach staggerOnMount(':scope > li', 30)}>
						{#each vm.recurring as item (item.id)}
							<li class="expenses-plan-row">
								<div class="min-w-0 flex-1">
									<p class="font-semibold truncate">{item.title}</p>
									<p class="text-xs text-muted-foreground">{item.frequency} · {item.pillar}</p>
								</div>
								<p class="font-semibold tabular-nums spring-pop" data-motion="spring">{item.amount}</p>
								<NativeButton class="btn-secondary px-3 py-1 text-xs" onclick={() => openPanel(`/expenses/record?month=${vm.monthQuery}&recurring=${item.id}`)}>Log</NativeButton>
								<NativeButton
									class="btn-secondary px-3 py-1 text-xs"
									onclick={() => openPanel(`/expenses/recurring/${item.id}?month=${vm.monthQuery}`, { feature: 'recurring_templates', name: 'Recurring templates' })}
									>Edit</NativeButton
								>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
		<section>
			<CardHeader title="Recent activity" />
			{#if vm.activity.length === 0}
				<EmptyState title="The ledger is quiet" description="Record a purchase or set up your budget pillars to get started." actionLabel="Record spend" actionHref="#" />
			{:else}
				<div>
					<div class="mt-3 grid gap-2 sm:grid-cols-[1fr_10rem]">
						<Field type="search" placeholder="Search spending log" bind:value={q} aria-label="Search spending log" />
						<SelectField
							bind:value={pillarFilter}
							aria-label="Filter spending pillar"
							options={[
								{ value: '', label: 'All pillars' },
								{ value: 'Fundamentals', label: 'Fundamentals' },
								{ value: 'Future you', label: 'Future you' },
								{ value: 'Fun', label: 'Fun' }
							]}
						/>
					</div>
					<ul class="expenses-activity-list mt-4 space-y-2">
						{#each vm.activity as item (item.id)}
							<li
								class="expenses-activity-row"
								data-title={item.title.toLowerCase()}
								data-pillar={item.pillar}
								hidden={!((!q || item.title.toLowerCase().includes(q.toLowerCase())) && (!pillarFilter || pillarFilter === item.pillar))}
							>
								<span class="expenses-activity-icon" aria-hidden="true">{item.icon}</span>
								<div class="min-w-0 flex-1">
									<p class="font-semibold truncate">{item.title}</p>
									<p class="text-xs text-muted-foreground">{item.date} · {item.pillar}</p>
								</div>
								<p class="font-semibold tabular-nums spring-pop" data-motion="spring">{item.amount}</p>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</section>
		<section>
			<CardHeader title="Suggestions" />
			{#if vm.suggestionsError}
				<p class="mt-2 text-sm text-[var(--color-danger)]">{vm.suggestionsError}</p>
			{:else if vm.suggestions.length === 0}
				<p class="text-sm text-muted-foreground">Smart tips will appear here once you have spending data.</p>
			{:else}
				<div class="expenses-suggestions mt-4 space-y-3">
					{#each vm.suggestions.filter((s) => !dismissed.includes(s.id)) as item (item.id)}
						<div id={'suggestion-' + item.id} class={'expenses-suggestion glass-card p-4 suggestion-' + item.severity}>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<p class="font-semibold">{item.title}</p>
									<p class="mt-1 text-sm text-muted-foreground">{item.message}</p>
									{#if item.savings !== '' && item.savings !== '$0.00'}
										<p class="mt-2 text-xs font-semibold text-muted-foreground">Potential savings: {item.savings}</p>
									{/if}
								</div>
								<form
									method="POST"
									action="?/dismissSuggestion"
									class="contents"
									use:enhance={() =>
										async ({ result }) => {
											if (result.type === 'success') dismissed = [...dismissed, item.id];
										}}
								>
									<input type="hidden" name="id" value={item.id} />
									<NativeButton
										type="submit"
										data-nq-submit={undefined}
										class="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
										aria-label="Dismiss suggestion">Dismiss</NativeButton
									>
								</form>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>

	<dialog.Dialog id="expense-action-dialog" bind:open={dialogOpen}>
		<dialog.Content class="glass-card vigil-modal-panel border-0 p-6 md:p-8 sm:max-w-2xl">
			{#if panel.kind === 'loading'}
				<div id="expense-action-loading" class="skeleton-indicator htmx-request">
					<ListSkeleton rows={3} />
				</div>
				<div id="expense-action-panel"></div>
			{:else if panel.kind === 'gate'}
				<div id="expense-action-panel"><ProGateOverlay featureName={panel.name} /></div>
			{:else if panel.kind === 'error'}
				<div id="expense-action-panel"><p class="text-sm text-danger" role="alert">{panel.message}</p></div>
			{:else if panel.kind === 'receipts'}
				<ReceiptImportPanel data={panel.data as never} />
			{:else}
				{@const Panel = panel.component}
				<Panel vm={panel.vm as never} />
			{/if}
		</dialog.Content>
	</dialog.Dialog>
</div>
