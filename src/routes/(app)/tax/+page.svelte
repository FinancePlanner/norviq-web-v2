<script lang="ts">
	// Port of norviq-web internal/pages/tax/page.templ (tax.Page).
	import { untrack } from 'svelte';
	import type { SubmitFunction } from '$app/forms';
	import { applyAction, enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import {
		Field,
		FormErrorBanner,
		PrimaryButton,
		SecondarySubmitButton,
		SelectField,
		SubmitButton,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import {
		accountOptions,
		actionPlanKind,
		actionPlanLegCount,
		isoDate,
		lossCategory,
		lossExpiry,
		money,
		rebalancingPlanCount,
		sprintfPercent,
		valueOptions
	} from '#lib/features/money/tax/helpers.js';
	import type { TaxWorkspace } from '#lib/features/money/tax/types.js';
	import AdvanceLumpSumInputPanel from '#lib/features/money/tax/components/AdvanceLumpSumInputPanel.svelte';
	import InstrumentPanels from '#lib/features/money/tax/components/InstrumentPanels.svelte';
	import ProfileForm from '#lib/features/money/tax/components/ProfileForm.svelte';
	import NotificationForm from '#lib/features/money/tax/components/NotificationForm.svelte';
	import OpportunityTableRow from '#lib/features/money/tax/components/OpportunityTableRow.svelte';
	import ScenarioPanel from '#lib/features/money/tax/components/ScenarioPanel.svelte';
	import LocationScenarioPanel from '#lib/features/money/tax/components/LocationScenarioPanel.svelte';
	import ActionPlanPanel from '#lib/features/money/tax/components/ActionPlanPanel.svelte';
	import ReportsPanel from '#lib/features/money/tax/components/ReportsPanel.svelte';

	let { data, form } = $props();
	const vm = $derived(data.vm);

	// #tax-workspace: Go swapped the scenario / location / plan fragments in
	// with hx-target. Without JS the action result renders the page with it.
	let workspace = $state<TaxWorkspace | null>(untrack(() => (form && 'workspace' in form ? (form.workspace ?? null) : null)));
	let workspaceError = $state('');

	const workspaceSubmit: SubmitFunction = withSpinner(() => async ({ result }) => {
		if (result.type === 'success') {
			workspaceError = '';
			workspace = (result.data?.workspace as TaxWorkspace | undefined) ?? null;
		} else if (result.type === 'failure') {
			workspaceError = String(result.data?.error ?? '');
		} else {
			await applyAction(result);
		}
	});

	const actionError = $derived(form && 'error' in form ? String(form.error ?? '') : '');
	const filtered = $derived(vm.accountFilter !== '' || vm.assetFilter !== '' || vm.statusFilter !== '');
</script>

<svelte:head>
	<title>Tax strategy - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<vigil.DeckPage pageClass="tax-modern-page" title="Tax strategy">
	<form method="get" action="/tax" class="flex flex-wrap items-end gap-3">
		<label class="field-label"
			>Jurisdiction
			<SelectField name="jurisdiction" class="mt-2" options={valueOptions(['US', 'PT', 'ES', 'DE', 'FR', 'IT'], vm.jurisdiction, '')} />
		</label>
		<Field name="taxYear" label="Tax year" type="number" value={String(vm.taxYear)} class="mt-2" />
		<SecondarySubmitButton class="px-4">Update rules</SecondarySubmitButton>
	</form>
	{#if vm.errorMessage !== ''}
		<div class="mt-6"><FormErrorBanner message={vm.errorMessage} /></div>
	{/if}
	{#if actionError !== ''}
		<div class="mt-6"><FormErrorBanner message={actionError} /></div>
	{/if}

	<!-- jurisdictionSupportBanner -->
	<section class="glass-card mt-6 border border-warning/20 bg-warning/5 p-5">
		<p class="text-footnote font-semibold text-muted-foreground">Support level · {vm.jurisdiction}</p>
		{#if vm.jurisdiction === 'US'}
			<p class="mt-2 text-sm font-semibold">
				Actionable US estimates when your profile is complete and <code class="text-xs">TAX_VALIDATED_JURISDICTIONS</code> includes US.
			</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Opportunities can become actionable. Always review with a tax professional before filing or trading.
			</p>
		{:else if vm.jurisdiction === 'FR' || vm.jurisdiction === 'IT'}
			<p class="mt-2 text-sm font-semibold">Professional review only — no production capital-gains rule pack yet.</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Norviq will not invent French or Italian tax rates or loss-carryforward ledgers until an evidence-backed pack ships. Imported lots
				remain available for your records.
			</p>
		{:else if vm.jurisdiction === 'ES'}
			<p class="mt-2 text-sm font-semibold">Estimate only until professional validation is enabled for Spain.</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Homogeneous-security windows depend on user-attested regulated-market admission (Markets toolbar). Automatic ISIN admission data is
				not available.
			</p>
		{:else if vm.jurisdiction === 'PT' || vm.jurisdiction === 'DE'}
			<p class="mt-2 text-sm font-semibold">Estimate only until professional validation is enabled for {vm.jurisdiction}.</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Detailed rule packs are implemented, but production remains estimate-only while <code class="text-xs"
					>TAX_VALIDATED_JURISDICTIONS</code
				> is limited to US. Actionable harvesting stays disabled.
			</p>
		{:else}
			<p class="mt-2 text-sm font-semibold">Educational estimates only.</p>
			<p class="mt-1 text-sm text-muted-foreground">Confirm support levels and assumptions below before acting.</p>
		{/if}
	</section>

	<div class="mt-6">
		<vigil.MetricStrip>
			<vigil.Metric label="Estimated tax drag" value={money(vm.dashboard.summary.embeddedUnrealizedLiability)} />
			<vigil.Metric label="Harvestable losses" value={money(vm.dashboard.summary.harvestableLosses)} />
			<vigil.Metric label="Potential net benefit" value={money(vm.dashboard.summary.estimatedNetBenefit)} />
		</vigil.MetricStrip>
	</div>
	{#if vm.dashboard.taxDrag}
		<vigil.Panel class="mt-6 rounded-lg p-6" titleID="tax-drag-panel">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class="command-metric-label">Tax drag projection</p>
					<h2 class="mt-2 text-2xl font-semibold tabular-nums">{money(vm.dashboard.taxDrag.projectedYearEndTax)} projected this year</h2>
				</div>
				<p class="text-sm text-muted-foreground">Year to date {money(vm.dashboard.taxDrag.yearToDateTax)}</p>
			</div>
			<vigil.CommandDeck class="is-3col mt-5">
				{#each vm.dashboard.taxDrag.components as component (component.id)}
					<div class="rounded-lg border border-current/10 p-4">
						<p class="command-metric-label">{component.label}</p>
						<p class="mt-1 text-lg font-semibold tabular-nums">{money(component.projectedYearEnd)}</p>
						<p class="mt-1 text-xs text-muted-foreground">{component.dataQuality}</p>
					</div>
				{/each}
			</vigil.CommandDeck>
		</vigil.Panel>
	{/if}
	{#if vm.dashboard.assumptions.length > 0}
		<vigil.Panel class="mt-6 rounded-lg p-6" titleID="tax-assumptions-panel">
			<p class="command-metric-label">Rule pack assumptions</p>
			<div class="mt-3 space-y-1">
				{#each vm.dashboard.assumptions as line, i (i)}
					<vigil.TerminalLine text={'> ' + line} />
				{/each}
			</div>
		</vigil.Panel>
	{/if}
	{#if vm.jurisdiction === 'ES'}
		<section class="glass-card mt-4 p-4 text-sm text-muted-foreground">
			<strong>Spain · market admission:</strong> listed vs unlisted status is user-attested from documentary evidence. Norviq does not auto-classify
			ISINs.
		</section>
		<InstrumentPanels {vm} kind="market-admission" />
	{/if}
	{#if vm.jurisdiction === 'DE'}
		<InstrumentPanels {vm} kind="fund-classification" />
	{/if}

	{#if !vm.isPro}
		<section class="glass-card mt-8 p-7">
			<p class="text-footnote font-semibold text-muted-foreground">Norviq Pro</p>
			<h2 class="mt-2 text-2xl font-semibold">Unlock your personalized tax workspace</h2>
			<p class="mt-2 max-w-2xl opacity-70">
				Classify accounts, inspect individual opportunities, compare scenarios, configure alerts, and export workpapers.
			</p>
			<PrimaryButton href="/settings/subscription" class="mt-5 inline-flex" fullWidth>View Pro plans</PrimaryButton>
		</section>
	{/if}
	{#if vm.isPro}
		{#if vm.jurisdiction === 'DE'}
			<AdvanceLumpSumInputPanel {vm} />
		{/if}
		<div class="mt-8 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
			<ProfileForm {vm} />
			<NotificationForm {vm} />
		</div>
		{#if vm.dashboard.locationOpportunities && vm.dashboard.locationOpportunities.length > 0}
			<section class="mt-10">
				<h2 class="text-2xl font-semibold">Asset location</h2>
				<p class="mt-1 opacity-60">Compare tax-aware account placement before creating a rebalancing draft.</p>
				<div class="mt-4 grid gap-4 lg:grid-cols-2">
					{#each vm.dashboard.locationOpportunities as item (item.id)}
						<!-- locationCard -->
						<article class="glass-card p-6">
							<div class="flex items-start justify-between gap-4">
								<div>
									<h3 class="text-xl font-semibold">{item.title}</h3>
									<p class="text-sm text-muted-foreground">{sprintfPercent(item.confidence * 100, 0)} confidence</p>
								</div>
								<span class="rounded-full border border-current/10 px-3 py-1 text-xs">{item.supportLevel}</span>
							</div>
							<div class="mt-5 grid grid-cols-2 gap-3">
								<div>
									<p class="text-xs text-muted-foreground">Annual savings</p>
									<p class="font-semibold">{money(item.annualSavings)}</p>
								</div>
								<div>
									<p class="text-xs text-muted-foreground">Immediate tax cost</p>
									<p class="font-semibold">{money(item.immediateTaxCost)}</p>
								</div>
							</div>
							<form class="mt-5" method="POST" action="/tax?/locationScenarios" use:enhance={workspaceSubmit}>
								<input type="hidden" name="opportunityId" value={item.id} /><input
									type="hidden"
									name="jurisdiction"
									value={vm.jurisdiction}
								/><input type="hidden" name="taxYear" value={vm.taxYear} /><SecondarySubmitButton>Compare placement</SecondarySubmitButton>
							</form>
						</article>
					{/each}
				</div>
			</section>
		{/if}
		<section class="mt-10">
			<h2 class="text-2xl font-semibold">Opportunities</h2>
			<p class="mt-1 opacity-60">Select one or more exact lots, choose reviewed replacements, then compare the combined outcome.</p>
			<form method="get" action="/tax" class="glass-card mt-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
				<input type="hidden" name="jurisdiction" value={vm.jurisdiction} />
				<input type="hidden" name="taxYear" value={vm.taxYear} />
				<label class="field-label"
					>Account
					<SelectField name="accountId" class="mt-2" options={accountOptions(vm, vm.accountFilter, 'All accounts')} />
				</label>
				<label class="field-label"
					>Asset class
					<SelectField name="assetClass" class="mt-2" options={valueOptions(vm.assetClasses, vm.assetFilter, 'All asset classes')} />
				</label>
				<label class="field-label"
					>Status
					<SelectField
						name="status"
						class="mt-2"
						options={valueOptions(['actionable', 'watch', 'blocked', 'dismissed', 'accepted'], vm.statusFilter, 'All statuses')}
					/>
				</label>
				<div class="flex items-end gap-2">
					<SecondarySubmitButton>Apply filters</SecondarySubmitButton>
					{#if filtered}
						<a class="btn-secondary" href="/tax?jurisdiction={vm.jurisdiction}&taxYear={vm.taxYear}">Clear</a>
					{/if}
				</div>
			</form>
			<form class="mt-4" action="/tax?/scenarios" method="POST" use:enhance={workspaceSubmit}>
				<input type="hidden" name="jurisdiction" value={vm.jurisdiction} /><input type="hidden" name="taxYear" value={vm.taxYear} />
				{#if vm.dashboard.opportunities.length === 0}
					<p class="glass-card p-6 opacity-60">No supported opportunities meet your threshold.</p>
				{:else}
					<vigil.DataTable class="mt-4">
						<thead>
							<tr>
								<th scope="col">Select</th>
								<th scope="col">Symbol</th>
								<th scope="col">Type</th>
								<th scope="col">Period</th>
								<th scope="col">Status</th>
								<th scope="col">Loss</th>
								<th scope="col">Benefit</th>
								<th scope="col">Replacement</th>
								<th scope="col"></th>
							</tr>
						</thead>
						<tbody>
							{#each vm.dashboard.opportunities as item (item.id)}
								<OpportunityTableRow {item} />
							{/each}
						</tbody>
					</vigil.DataTable>
					<SubmitButton class="mt-5">Compare selected lots</SubmitButton>
				{/if}
			</form>
			<div id="tax-workspace" class="mt-5">
				{#if workspaceError !== ''}
					<FormErrorBanner message={workspaceError} />
				{:else if workspace?.kind === 'scenario'}
					<ScenarioPanel s={workspace.scenario} submit={workspaceSubmit} />
				{:else if workspace?.kind === 'location'}
					<LocationScenarioPanel s={workspace.scenario} submit={workspaceSubmit} />
				{:else if workspace?.kind === 'plan'}
					<ActionPlanPanel plan={workspace.plan} />
				{/if}
			</div>
		</section>
		{#if vm.actionPlans.length > 0}
			<!-- actionPlanHistory -->
			<section class="mt-10">
				<h2 class="text-2xl font-semibold">Plan history</h2>
				<div class="mt-4 overflow-x-auto rounded-lg border border-current/10">
					<table class="w-full text-left text-sm">
						<thead><tr><th class="p-4">Created</th><th>Strategy</th><th>Status</th><th>Legs</th><th>Rebalancing drafts</th></tr></thead>
						<tbody>
							{#each vm.actionPlans as plan (plan.id)}
								<tr class="border-t border-current/10"
									><td class="p-4">{isoDate(plan.createdAt)}</td><td>{actionPlanKind(plan)}</td><td>{plan.status}</td><td
										>{actionPlanLegCount(plan)}</td
									><td>{rebalancingPlanCount(plan)}</td></tr
								>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}
		{#if (vm.jurisdiction === 'PT' || vm.jurisdiction === 'DE' || vm.jurisdiction === 'US' || vm.jurisdiction === 'ES') && vm.carryforwards}
			<!-- carryforwardLedger -->
			<section class="mt-10">
				<div class="mb-4">
					<h2 class="text-2xl font-semibold">Carried tax losses</h2>
					<p class="opacity-60">Eligible balances, expiry, and consumption history.</p>
				</div>
				<div class="glass-card p-6">
					<p class="text-sm text-muted-foreground">Available for {vm.carryforwards.asOfTaxYear}</p>
					<p class="mt-1 text-3xl font-semibold">{money(vm.carryforwards.totalAvailable)}</p>
					<div class="mt-6 grid gap-3">
						{#if vm.carryforwards.balances.length === 0}
							<p class="opacity-60">No carried losses recorded.</p>
						{/if}
						{#each vm.carryforwards.balances as balance (balance.id)}
							<details class="rounded-lg border border-current/10 p-4">
								<summary class="cursor-pointer list-none"
									><div class="flex items-center justify-between gap-4">
										<div>
											<div class="flex items-center gap-2">
												<p class="font-medium">{balance.sourceTaxYear}</p>
												<span class="rounded-full bg-black/5 px-2 py-0.5 text-xs">{lossCategory(balance)}</span>
											</div>
											<p class="text-sm text-muted-foreground">{lossExpiry(balance)}</p>
										</div>
										<p class="font-semibold">{money(balance.remainingAmount)}</p>
									</div></summary
								>
								<div class="mt-4 border-t border-current/10 pt-4 text-sm">
									<p>Original loss: {money(balance.originalAmount)}</p>
									{#each balance.applications as application (application.id)}
										<p class="mt-2 opacity-70">Applied in {application.targetTaxYear}: {money(application.amount)}</p>
									{/each}
								</div>
							</details>
						{/each}
					</div>
				</div>
			</section>
		{/if}
		{#if vm.jurisdiction === 'FR' || vm.jurisdiction === 'IT'}
			<section class="glass-card mt-8 p-6">
				<p class="text-footnote font-semibold text-muted-foreground">Loss carryforwards</p>
				<p class="mt-2 text-sm text-muted-foreground">
					Loss-carryforward ledgers are not calculated for {vm.jurisdiction} until a complete capital-gains rule pack is enabled. Imported lots
					remain visible for your records only.
				</p>
			</section>
		{/if}
	{/if}
	<ReportsPanel {vm} />
	<p class="mt-10 text-sm text-muted-foreground">{vm.dashboard.disclaimer}</p>
</vigil.DeckPage>
