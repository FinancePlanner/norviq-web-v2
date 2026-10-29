<script lang="ts">
	// pages/portfolio/retirement.templ RetirementPage / RetirementPickerPage
	import { enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { EmptyState, Field, NativeButton, SelectField, withSpinner } from '#lib/components/norviq/index.js';
	import { formatFloat } from '#lib/format.js';
	import type { RetirementPlan } from '#lib/features/portfolio/workspace/api.server.js';
	import type { PageProps } from './$types';
	import type { RetirementViewModel } from './+page.server.js';

	let { data, form }: PageProps = $props();

	const vm: RetirementViewModel | null = $derived(form?.projected ?? (data.picker ? null : data));
	const countries = ['US', 'PT', 'ES', 'DE', 'FR', 'IT'];

	const pensionAmount = (plan: RetirementPlan) => (plan.input.publicPension ? formatFloat(plan.input.publicPension.annualAmount, 0) : '0');
	const pensionAge = (plan: RetirementPlan) => (plan.input.publicPension ? String(plan.input.publicPension.startAge) : '67');
	function accountValue(plan: RetirementPlan, field: 'balance' | 'contribution' | 'fee'): string {
		const account = plan.input.accounts?.[0];
		if (!account) return '0';
		if (field === 'balance') return formatFloat(account.currentBalance, 0);
		if (field === 'contribution') return formatFloat(account.employeeAnnualContribution, 0);
		return formatFloat(account.annualFeeRate * 100, 2);
	}
	const money = (currency: string, v: number, suffix = '') => `${currency} ${formatFloat(v, 0)}${suffix}`;
</script>

<svelte:head>
	<title>Retirement plan - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

{#snippet retirementInput(label: string, name: string, value: string, min: string, max: string, step: string)}
	<Field {name} {label} type="number" {value} required class="w-full" wrapperClass="block text-sm" {min} {max} {step} />
{/snippet}

{#snippet retirementMetric(label: string, value: string)}
	<div class="rounded-lg bg-current/5 px-4 py-4">
		<p class="text-xs text-muted-foreground">{label}</p>
		<p class="mt-2 font-semibold tabular-nums">{value}</p>
	</div>
{/snippet}

{#if data.picker && !form?.projected}
	<div class="app-page-content vigil-canvas-page retirement-planner portfolio-modern-page">
		<vigil.ModernPageHeader title="Retirement plan" />
		{#if data.errorMessage}
			<div class="mt-5 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm" role="alert">{data.errorMessage}</div>
		{/if}
		{#if data.items.length === 0}
			<div class="mt-6">
				<EmptyState
					title="No portfolio yet"
					description="Create a portfolio first, then plan the retirement it should fund."
					actionLabel="Create a portfolio"
					actionHref="/portfolios"
				/>
			</div>
		{:else}
			<section class="mt-6 glass-card p-5 md:p-6">
				<h2 class="text-lg font-semibold">Choose a portfolio</h2>
				<p class="mt-1 text-sm text-muted-foreground">Pick the portfolio to plan retirement for.</p>
				<div class="mt-5 grid gap-3 sm:grid-cols-2">
					{#each data.items as item (item.id)}
						<a
							class="rounded-lg border border-current/10 bg-current/5 px-4 py-4 font-medium transition hover:border-[var(--color-tint)]"
							href={'/portfolio/retirement?portfolio=' + item.id}>{item.name}</a
						>
					{/each}
				</div>
			</section>
		{/if}
	</div>
{:else if vm}
	{#snippet toolbar()}
		{#if vm.portfolios.length > 1}
			<label class="sr-only" for="retirement-portfolio-switch">Switch portfolio</label>
			<select
				id="retirement-portfolio-switch"
				class="form-select w-auto"
				onchange={(e) => (window.location.href = '/portfolio/retirement?portfolio=' + encodeURIComponent(e.currentTarget.value))}
			>
				{#each vm.portfolios as item (item.id)}
					<option value={item.id} selected={item.id === vm.portfolio.id}>{item.name}</option>
				{/each}
			</select>
		{/if}
		<a class="btn-secondary" href={'/portfolios?portfolio=' + vm.portfolio.id}>Portfolio settings</a>
	{/snippet}
	<div id="retirement-page" class="app-page-content vigil-canvas-page retirement-planner portfolio-modern-page">
		<vigil.ModernPageHeader title="Retirement plan" subtitle={vm.portfolio.name} actions={toolbar} />
		{#if vm.notice}
			<div class="mt-5 rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-sm" role="status">{vm.notice}</div>
		{/if}
		{#if vm.error}
			<div class="mt-5 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm" role="alert">{vm.error}</div>
		{/if}
		<div class="mt-5 rounded-[var(--radius-control)] border border-border bg-muted/40 px-4 py-3 text-footnote" role="note">
			This plans one portfolio around a salary. To plan around what your life actually costs — and be told the exact move
			that closes the gap — use
			<a class="underline" href="/planning/retire">Retire</a>.
		</div>
		{#if vm.projection}
			{@const p = vm.projection}
			<vigil.Panel class="mt-6 p-5 md:p-6" titleID="readiness-title">
				<div class="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p class="text-sm text-muted-foreground">Estimated readiness</p>
						<h2 id="readiness-title" class="mt-1 text-4xl font-semibold tabular-nums vigil-mono">
							{formatFloat(p.summary.readinessProbability * 100, 0) + '%'}
						</h2>
					</div>
					<p class="text-sm text-muted-foreground">Rule set {p.ruleVersion}</p>
				</div>
				<div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{@render retirementMetric('At retirement', money(p.currency, p.summary.medianValueAtRetirement))}
					{@render retirementMetric('Sustainable spending', money(p.currency, p.summary.sustainableAnnualSpending, ' / year'))}
					{@render retirementMetric('Retirement income', money(p.currency, p.summary.projectedAnnualRetirementIncome, ' / year'))}
					{@render retirementMetric('Contribution headroom', money(p.currency, p.summary.annualContributionHeadroom, ' / year'))}
				</div>
				{#each p.warnings ?? [] as warning, i (i)}
					<p class="mt-3 text-sm text-warning">{warning}</p>
				{/each}
			</vigil.Panel>
		{/if}
		<form
			method="post"
			action={'/portfolio/retirement?portfolio=' + vm.portfolio.id}
			class="vigil-command-split mt-6"
			use:enhance={withSpinner(() => async ({ result, update }) => {
				await update({ reset: false });
				// hx-swap "show:top showTarget:window"
				if (result.type === 'success') window.scrollTo({ top: 0 });
			})}
		>
			<div class="vigil-command-split-main">
				<vigil.Panel class="p-5 md:p-6">
					<h2 class="text-lg font-semibold">Timeline and income</h2>
					<div class="mt-5 grid grid-cols-2 gap-4">
						{@render retirementInput('Current age', 'currentAge', String(vm.plan.input.currentAge), '18', '90', '1')}
						{@render retirementInput('Retirement age', 'retirementAge', String(vm.plan.input.retirementAge), '40', '85', '1')}
						{@render retirementInput('Plan through age', 'longevityAge', String(vm.plan.input.longevityAge), '70', '120', '1')}
						<SelectField
							name="jurisdiction"
							label="Country"
							class="w-full"
							wrapperClass="block text-sm"
							options={countries.map((c) => ({ value: c, label: c, selected: vm.plan.input.jurisdiction === c }))}
						/>
						{@render retirementInput('Annual salary', 'annualSalary', formatFloat(vm.plan.input.annualSalary, 0), '0', '', '100')}
						{@render retirementInput('Desired annual spending', 'desiredSpending', formatFloat(vm.plan.input.desiredAnnualSpending, 0), '0', '', '100')}
						{@render retirementInput('Public pension per year', 'publicPension', pensionAmount(vm.plan), '0', '', '100')}
						{@render retirementInput('Pension start age', 'pensionAge', pensionAge(vm.plan), '50', '90', '1')}
					</div>
				</vigil.Panel>
			</div>
			<vigil.CommandSplitAside>
				<vigil.Panel class="p-5 md:p-6">
					<h2 class="text-lg font-semibold">Portfolio assumptions</h2>
					<div class="mt-5 grid grid-cols-2 gap-4">
						{@render retirementInput('Current balance', 'balance', accountValue(vm.plan, 'balance'), '0', '', '100')}
						{@render retirementInput('Annual contribution', 'contribution', accountValue(vm.plan, 'contribution'), '0', '', '100')}
						{@render retirementInput('Expected return (%)', 'return', formatFloat(vm.plan.input.expectedAnnualReturn * 100, 1), '-20', '30', '0.1')}
						{@render retirementInput('Volatility (%)', 'volatility', formatFloat(vm.plan.input.annualVolatility * 100, 1), '0', '80', '0.1')}
						{@render retirementInput('Inflation (%)', 'inflation', formatFloat(vm.plan.input.inflationRate * 100, 1), '0', '20', '0.1')}
						{@render retirementInput('Annual fee (%)', 'fee', accountValue(vm.plan, 'fee'), '0', '10', '0.01')}
					</div>
					<p class="mt-5 text-xs leading-relaxed text-muted-foreground">
						Public pension amounts are entered manually. Rules are versioned and never refresh assumptions without your confirmation.
					</p>
					<div class="mt-6 flex flex-wrap gap-3">
						<NativeButton type="submit" class="btn-secondary" name="intent" value="save">Save plan</NativeButton>
						<NativeButton type="submit" class="btn-primary" name="intent" value="project">Save and run projection</NativeButton>
					</div>
				</vigil.Panel>
			</vigil.CommandSplitAside>
		</form>
	</div>
{/if}
