<script lang="ts">
	// scenarios.Page(vm) — norviq-web internal/pages/scenarios/page.templ.
	//
	// Fragment routes → v2 (all at the Go URLs, all behind the same gate):
	//   POST /scenarios/snapshot-review   → +server.ts JSON → SnapshotReview.svelte
	//   POST /scenarios/runs, /scenarios/configurations/{id}/runs → { redirect }
	//   GET/DELETE /scenarios/runs/{id}   → JSON polled / cancelled by RunCard.svelte
	//   POST /scenarios/compare           → JSON → Comparison.svelte
	//   POST /scenarios/risk-profiles, DELETE …/risk-profiles/{id}, DELETE …/configurations/{id} → { redirect }
	//
	// Go oddity not kept: @Management(vm.Workspace) sat inside the runs loop
	// (and inside the compare <form>), so it rendered once per run, with nested
	// forms the browser dropped. v2 renders it once, after the runs list, and
	// only when there are runs, as Go did.
	import { goto } from '$app/navigation';
	import {
		CheckboxField,
		EmptyState,
		Field,
		FormErrorBanner,
		NativeInput,
		SecondarySubmitButton,
		SelectField,
		SkeletonBlock,
		SubmitButton,
		TextareaField
	} from '#lib/components/norviq/index.js';
	import type { Option } from '#lib/components/norviq/types.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { postForm } from '#lib/features/planning-tools/scenarios/client.js';
	import Comparison from '#lib/features/planning-tools/scenarios/Comparison.svelte';
	import Management from '#lib/features/planning-tools/scenarios/Management.svelte';
	import RunCard from '#lib/features/planning-tools/scenarios/RunCard.svelte';
	import SnapshotReview from '#lib/features/planning-tools/scenarios/SnapshotReview.svelte';
	import type {
		CompareResponse,
		ScenarioRun,
		SnapshotReviewResponse
	} from '#lib/features/planning-tools/scenarios/types.js';
	import { goG, uid } from '#lib/features/planning-tools/scenarios/view.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const workspace = $derived(data.workspace);

	// #scenario-form-error, #scenario-snapshot-review and #scenario-comparison.
	let formError = $state('');
	let review = $state<
		{ kind: 'review'; review: SnapshotReviewResponse } | { kind: 'error'; message: string } | null
	>(null);
	let comparison = $state<ScenarioRun[] | null>(null);
	let reviewPending = $state(false);
	let comparePending = $state(false);

	const assetClassOptions: Option[] = [
		{ value: 'stock', label: 'Stock' },
		{ value: 'etf', label: 'ETF' },
		{ value: 'mutual_fund', label: 'Mutual fund' },
		{ value: 'crypto', label: 'Crypto' },
		{ value: 'cash', label: 'Cash' },
		{ value: 'bond', label: 'Bond' },
		{ value: 'real_estate', label: 'Real estate / REIT' },
		{ value: 'commodity', label: 'Commodity' }
	];

	// options.go
	const portfolioOptions = $derived<Option[]>([
		{ value: '', label: 'Choose portfolio' },
		...workspace.portfolios.map((p) => ({ value: uid(p.id), label: p.name }))
	]);
	const goalOptions = $derived<Option[]>([
		{ value: '', label: 'No linked goal' },
		...workspace.goals.map((g) => ({ value: uid(g.id), label: g.name }))
	]);
	const historicalPresetOptions = $derived<Option[]>(
		workspace.catalog.historicalScenarios.map((item) => ({
			value: item.id,
			label: item.name + ' (' + item.startDate + ' – ' + item.endDate + ')'
		}))
	);

	// HX-Redirect: a full navigation in Go, so the page starts over.
	async function navigate(to: string) {
		formError = '';
		review = null;
		comparison = null;
		await goto(to, { invalidateAll: true });
	}

	async function reviewSnapshot(event: SubmitEvent) {
		event.preventDefault();
		reviewPending = true;
		const result = await postForm<SnapshotReviewResponse>(
			'/scenarios/snapshot-review',
			new FormData(event.currentTarget as HTMLFormElement)
		);
		reviewPending = false;
		if (result?.kind === 'ok') review = { kind: 'review', review: result.data };
		else if (result?.kind === 'formError') review = { kind: 'error', message: result.message };
	}

	async function compare(event: SubmitEvent) {
		event.preventDefault();
		comparePending = true;
		const result = await postForm<CompareResponse>(
			'/scenarios/compare',
			new FormData(event.currentTarget as HTMLFormElement)
		);
		comparePending = false;
		if (result?.kind === 'ok') comparison = result.data.runs;
	}
</script>

<svelte:head>
	<title>Scenario planning - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-canvas-page scenarios-modern-page">
	<vigil.ModernPageHeader title="Scenario planning" />
	{#if data.errorMessage !== ''}
		<div class="mt-6">
			<FormErrorBanner message={data.errorMessage} />
		</div>
	{/if}
	{#if data.errorMessage === ''}
		<div class="vigil-command-split mt-8">
			<div class="vigil-command-split-main">
				<vigil.Panel class="p-6">
					<div class="mb-6">
						<h2 class="text-title3 font-semibold">Build a stress test</h2>
					</div>
					<form onsubmit={reviewSnapshot} class="space-y-5">
						<div id="scenario-form-error">
							{#if formError}<FormErrorBanner message={formError} />{/if}
						</div>
						<Field
							name="name"
							label="Name"
							value="Portfolio stress test"
							required
							class="mt-2 w-full"
							wrapperClass="block text-sm font-medium"
						/>
						<div class="grid gap-4 sm:grid-cols-2">
							<SelectField
								name="portfolioId"
								label="Portfolio"
								required
								class="mt-2"
								wrapperClass="block text-sm font-medium"
								options={portfolioOptions}
							/>
							<Field
								name="baseCurrency"
								label="Base currency"
								value="USD"
								required
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								maxlength={3}
							/>
							{#if workspace.cryptoHoldings.length > 0}
								<fieldset class="rounded-lg border p-4 sm:col-span-2">
									<legend class="px-1 text-sm font-medium">Include crypto holdings</legend>
									<div class="mt-2 grid gap-2 sm:grid-cols-2">
										{#each workspace.cryptoHoldings as holding (holding.id)}
											<label class="flex items-center gap-2 text-sm">
												<CheckboxField name="cryptoHoldingId" value={uid(holding.id)} />
												<span>{holding.symbol} · {goG(holding.quantity, 8)}</span>
											</label>
										{/each}
									</div>
									<p class="mt-2 text-xs text-muted-foreground">
										Only selected crypto holdings are frozen into this snapshot.
									</p>
								</fieldset>
							{/if}
						</div>
						<SelectField
							name="financialGoalId"
							label="Financial goal (optional)"
							class="mt-2"
							wrapperClass="block text-sm font-medium"
							options={goalOptions}
						/>
						<fieldset>
							<legend class="text-sm font-medium">Scenario type</legend>
							<div class="mt-2 grid grid-cols-3 gap-2">
								<label class="cursor-pointer rounded-lg border p-3 text-center text-sm">
									<NativeInput type="radio" name="kind" value="historical" class="mr-1" checked />
									Historical
								</label>
								<label class="cursor-pointer rounded-lg border p-3 text-center text-sm">
									<NativeInput type="radio" name="kind" value="custom" class="mr-1" />
									Custom
								</label>
								<label class="cursor-pointer rounded-lg border p-3 text-center text-sm">
									<NativeInput type="radio" name="kind" value="monte_carlo" class="mr-1" />
									Monte Carlo
								</label>
							</div>
						</fieldset>
						<SelectField
							name="historicalPreset"
							label="Historical event"
							class="mt-2"
							wrapperClass="block text-sm font-medium"
							options={historicalPresetOptions}
						/>
						<div class="grid gap-4 sm:grid-cols-2">
							<SelectField
								name="assetClassTarget"
								label="Asset class"
								options={assetClassOptions}
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
							/>
							<Field
								name="assetClassShock"
								label="Asset-class shock (%)"
								type="number"
								value="-20"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								min="-100"
								max="100"
								step="0.1"
							/>
							<SelectField
								name="recovery"
								label="Recovery"
								options={[
									{ value: 'none', label: 'None' },
									{ value: 'linear', label: 'Linear' },
									{ value: 'mean_reverting', label: 'Mean reverting' }
								]}
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
							/>
							<Field
								name="customHorizonMonths"
								label="Custom horizon (months)"
								type="number"
								value="12"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								min="1"
								max="120"
							/>
							<Field
								name="rateShiftBps"
								label="Rate shift (bps)"
								type="number"
								value="0"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								min="-5000"
								max="5000"
							/>
							<Field
								name="volatilityMultiplier"
								label="Volatility multiplier"
								type="number"
								value="1"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								min="0"
								max="10"
								step="0.1"
							/>
							<Field
								name="monteCarloHorizonMonths"
								label="Monte Carlo horizon (months)"
								type="number"
								value="360"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								min="1"
								max="600"
							/>
							<Field
								name="paths"
								label="Paths"
								type="number"
								value="10000"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								min="100"
								max="50000"
							/>
							<SelectField
								name="distribution"
								label="Distribution"
								options={[
									{ value: 'block_bootstrap', label: 'Block bootstrap' },
									{ value: 'normal', label: 'Multivariate normal' },
									{ value: 'student_t', label: 'Student-t' }
								]}
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
							/>
							<Field
								name="annualReturn"
								label="Expected annual return (%)"
								type="number"
								value="7"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								min="-100"
								max="100"
								step="0.1"
							/>
							<Field
								name="annualVolatility"
								label="Annual volatility (%)"
								type="number"
								value="15"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								min="0"
								max="500"
								step="0.1"
							/>
							<Field
								name="inflation"
								label="Inflation (%)"
								type="number"
								value="2"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								min="-20"
								max="100"
								step="0.1"
							/>
							<Field
								name="monthlyContribution"
								label="Monthly contribution"
								type="number"
								value="0"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								min="0"
								step="1"
							/>
							<Field
								name="contributionGrowth"
								label="Annual contribution growth (%)"
								type="number"
								value="0"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								min="-100"
								max="100"
								step="0.1"
							/>
							<Field
								name="degreesOfFreedom"
								label="Student-t degrees of freedom"
								type="number"
								value="5"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								min="2.01"
								max="100"
								step="0.1"
							/>
							<Field
								name="bootstrapBlockMonths"
								label="Bootstrap block (months)"
								type="number"
								value="6"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
								min="1"
								max="120"
							/>
							<Field
								name="seed"
								label="Random seed (optional)"
								type="number"
								class="mt-2 w-full"
								wrapperClass="block text-sm font-medium"
							/>
						</div>
						<details class="rounded-lg border p-4">
							<summary class="cursor-pointer text-sm font-medium">Scoped custom shocks</summary>
							<p class="mt-2 text-xs text-muted-foreground">
								Optional target and percentage pairs. Applicable shocks compound; a holding target
								overrides broader percentage shocks.
							</p>
							<div class="mt-4 grid gap-4 sm:grid-cols-2">
								<Field
									name="holdingShockTarget"
									label="Holding ID"
									class="mt-2 w-full"
									wrapperClass="block text-sm font-medium"
								/><Field
									name="holdingShock"
									label="Holding shock (%)"
									type="number"
									class="mt-2 w-full"
									wrapperClass="block text-sm font-medium"
									min="-100"
									max="100"
									step="0.1"
								/>
								<Field
									name="sectorShockTarget"
									label="Sector"
									class="mt-2 w-full"
									wrapperClass="block text-sm font-medium"
								/><Field
									name="sectorShock"
									label="Sector shock (%)"
									type="number"
									class="mt-2 w-full"
									wrapperClass="block text-sm font-medium"
									min="-100"
									max="100"
									step="0.1"
								/>
								<Field
									name="regionShockTarget"
									label="Region"
									class="mt-2 w-full"
									wrapperClass="block text-sm font-medium"
								/><Field
									name="regionShock"
									label="Region shock (%)"
									type="number"
									class="mt-2 w-full"
									wrapperClass="block text-sm font-medium"
									min="-100"
									max="100"
									step="0.1"
								/>
								<Field
									name="currencyShockTarget"
									label="Currency"
									class="mt-2 w-full"
									wrapperClass="block text-sm font-medium"
									maxlength={3}
								/><Field
									name="currencyShock"
									label="Currency shock (%)"
									type="number"
									class="mt-2 w-full"
									wrapperClass="block text-sm font-medium"
									min="-100"
									max="100"
									step="0.1"
								/>
							</div>
						</details>
						<details class="rounded-lg border p-4">
							<summary class="cursor-pointer text-sm font-medium"
								>Advanced multi-asset assumptions</summary
							>
							<p class="mt-2 text-xs text-muted-foreground">
								Optional JSON arrays using the same asset order. Covariance is annualized.
							</p>
							<div class="mt-4 grid gap-4">
								<TextareaField
									name="assetWeights"
									label="Asset weights"
									placeholder="[0.6, 0.4]"
									class="mt-2 min-h-20 w-full font-mono text-xs"
									wrapperClass="block text-sm font-medium"
								/>
								<TextareaField
									name="assetAnnualReturns"
									label="Annual returns"
									placeholder="[0.08, 0.04]"
									class="mt-2 min-h-20 w-full font-mono text-xs"
									wrapperClass="block text-sm font-medium"
								/>
								<TextareaField
									name="annualCovariance"
									label="Annual covariance matrix"
									placeholder="[[0.04, 0.006], [0.006, 0.01]]"
									class="mt-2 min-h-24 w-full font-mono text-xs"
									wrapperClass="block text-sm font-medium"
								/>
							</div>
						</details>
						<CheckboxField
							name="isSaved"
							label="Save this configuration"
							value="true"
							wrapperClass="flex items-center gap-2 text-sm"
						/>
						<SubmitButton class="w-full">Review snapshot</SubmitButton>
					</form>
					<div
						id="scenario-snapshot-loading"
						class="skeleton-indicator mt-5"
						class:htmx-request={reviewPending}
					>
						<SkeletonBlock heightClass="h-40" />
					</div>
					<div id="scenario-snapshot-review" class="mt-5">
						{#if review?.kind === 'review'}
							<SnapshotReview
								snapshot={review.review.snapshot}
								values={review.review.values}
								onformerror={(message) => (formError = message)}
								onredirect={navigate}
							/>
						{:else if review?.kind === 'error'}
							<FormErrorBanner message={review.message} />
						{/if}
					</div>
				</vigil.Panel>
			</div>
			<vigil.CommandSplitAside>
				<div class="flex items-end justify-between">
					<h2 class="text-title3 font-semibold">Recent runs</h2>
					<span class="text-footnote text-muted-foreground tabular-nums"
						>{workspace.runs.length} runs</span
					>
				</div>
				<form onsubmit={compare}>
					<div class="vigil-dense-list mt-4">
						{#if workspace.runs.length === 0}
							<EmptyState
								title="No scenarios yet"
								description="Build your first stress test to see its progress and results here."
							/>
						{/if}
						{#each workspace.runs as run (run.id)}
							<div class="flex items-start gap-3">
								{#if run.state === 'completed'}
									<CheckboxField
										name="runId"
										value={uid(run.id)}
										wrapperClass="mt-6"
										aria-label="Include run in comparison"
									/>
								{/if}
								<div class="min-w-0 flex-1"><RunCard {run} /></div>
							</div>
						{/each}
					</div>
					<SecondarySubmitButton class="mt-4 w-full">Compare selected runs</SecondarySubmitButton>
				</form>
				{#if workspace.runs.length > 0}
					<Management
						{workspace}
						onformerror={(message) => (formError = message)}
						onredirect={navigate}
					/>
				{/if}
				<div
					id="scenario-comparison-loading"
					class="skeleton-indicator mt-6"
					class:htmx-request={comparePending}
				>
					<SkeletonBlock heightClass="h-40" />
				</div>
				<div id="scenario-comparison" class="mt-6">
					{#if comparison}<Comparison runs={comparison} />{/if}
				</div>
			</vigil.CommandSplitAside>
		</div>
	{/if}
</div>
