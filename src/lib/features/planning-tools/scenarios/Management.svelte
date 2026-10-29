<script lang="ts">
	// scenarios.Management(workspace): saved scenarios, the goals link, and
	// holding risk profiles. Its forms hx-post'ed into #scenario-management-error
	// (the snapshot review or a FormError); deletes were hx-delete + hx-confirm
	// answered by HX-Redirect /scenarios.
	import {
		Field,
		FormErrorBanner,
		NativeButton,
		SecondarySubmitButton,
		SelectField,
		CheckboxField
	} from '#lib/components/norviq/index.js';
	import type { Option } from '#lib/components/norviq/types.js';
	import { deleteRequest, postForm } from './client.js';
	import SnapshotReview from './SnapshotReview.svelte';
	import type { ScenarioWorkspace, SnapshotReviewResponse } from './types.js';
	import { resultJSON, uid } from './view.js';

	let {
		workspace,
		onformerror,
		onredirect
	}: {
		workspace: ScenarioWorkspace;
		onformerror: (message: string) => void;
		onredirect: (to: string) => void;
	} = $props();

	type Slot = { kind: 'review'; review: SnapshotReviewResponse } | { kind: 'error'; message: string } | null;
	let slot = $state<Slot>(null);

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

	// holdingOptions
	const holdingOptions = $derived<Option[]>([
		{ value: '', label: 'Choose holding' },
		...workspace.holdings.map((h) => ({ value: uid(h.id), label: h.symbol + ' · ' + h.category }))
	]);

	async function submitTo(url: string, event: SubmitEvent) {
		event.preventDefault();
		const form = event.currentTarget as HTMLFormElement;
		form.classList.add('htmx-request');
		const result = await postForm<SnapshotReviewResponse>(url, new FormData(form));
		form.classList.remove('htmx-request');
		if (result?.kind === 'ok') slot = { kind: 'review', review: result.data };
		else if (result?.kind === 'formError') slot = { kind: 'error', message: result.message };
		else if (result?.kind === 'redirect') onredirect(result.to);
	}

	async function remove(url: string, question: string) {
		if (!confirm(question)) return;
		const result = await deleteRequest(url);
		if (result?.kind === 'redirect') onredirect(result.to);
	}
</script>

<div class="mt-8 grid gap-6 xl:grid-cols-2">
	<section class="glass-card p-6">
		<p class="text-footnote font-semibold text-muted-foreground">Reusable inputs</p>
		<h2 class="mt-2 text-xl font-semibold">Saved scenarios</h2>
		<div class="mt-5 space-y-3">
			{#each workspace.scenarios as scenario (scenario.id)}
				{#if scenario.isSaved}
					<details class="rounded-lg border p-4">
						<summary class="cursor-pointer"
							><span class="font-medium">{scenario.name}</span><span class="ml-2 text-footnote text-muted-foreground">{scenario.kind}</span></summary
						>
						<pre class="mt-3 max-h-44 overflow-auto rounded-xl bg-black/5 p-3 text-xs">{resultJSON(scenario.configuration)}</pre>
						<form class="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]" onsubmit={(e) => submitTo('/scenarios/snapshot-review', e)}>
							<input type="hidden" name="savedScenarioId" value={uid(scenario.id)} /><input
								type="hidden"
								name="portfolioId"
								value={uid(scenario.portfolioListId)}
							/>
							<Field
								name="baseCurrency"
								label="Snapshot currency"
								value="USD"
								required
								class="mt-2 w-full"
								wrapperClass="text-sm font-medium"
								maxlength={3}
							/>
							{#if workspace.cryptoHoldings.length > 0}
								<fieldset class="sm:col-span-2 rounded-xl border p-3">
									<legend class="px-1 text-xs font-medium">Include crypto holdings</legend>
									{#each workspace.cryptoHoldings as holding (holding.id)}
										<label class="mr-4 inline-flex items-center gap-2 text-sm">
											<CheckboxField name="cryptoHoldingId" value={uid(holding.id)} />
											<span>{holding.symbol}</span>
										</label>
									{/each}
								</fieldset>
							{/if}
							<Field name="seed" type="number" placeholder="Random seed (optional)" aria-label="Random seed" /><SecondarySubmitButton
								>Review and run</SecondarySubmitButton
							>
						</form>
						<NativeButton
							class="mt-3 text-sm text-danger"
							onclick={() => remove('/scenarios/configurations/' + uid(scenario.id), 'Delete this saved scenario and its runs?')}
							>Delete configuration</NativeButton
						>
					</details>
				{/if}
			{/each}
			{#if workspace.scenarios.length === 0}
				<p class="text-sm text-muted-foreground">Save a run configuration to reuse it here.</p>
			{/if}
		</div>
	</section>
	<section class="glass-card p-6">
		<p class="text-footnote font-semibold text-muted-foreground">Reusable inputs</p>
		<h2 class="mt-2 text-xl font-semibold">Financial goals</h2>
		<p class="mt-2 text-sm text-muted-foreground">
			Goals are managed in the dedicated planning workspace and remain available here as scenario inputs.
		</p>
		<a class="btn-secondary mt-5 inline-flex" href="/goals">Open financial goals</a>
	</section>
	<section class="glass-card p-6">
		<p class="text-footnote font-semibold text-muted-foreground">Snapshot classification</p>
		<h2 class="mt-2 text-xl font-semibold">Holding risk profiles</h2>
		<form class="mt-5 grid gap-4 sm:grid-cols-2" onsubmit={(e) => submitTo('/scenarios/risk-profiles', e)}>
			<SelectField
				name="holdingId"
				label="Holding"
				required
				class="mt-2"
				wrapperClass="block text-sm font-medium sm:col-span-2"
				options={holdingOptions}
			/>
			<SelectField
				name="assetCategory"
				label="Asset class"
				required
				options={assetClassOptions}
				class="mt-2 w-full"
				wrapperClass="block text-sm font-medium"
			/>
			<Field name="benchmarkProxy" label="Benchmark proxy" placeholder="SPY" class="mt-2 w-full" wrapperClass="block text-sm font-medium" />
			<Field name="sector" label="Sector" class="mt-2 w-full" wrapperClass="block text-sm font-medium" />
			<Field name="region" label="Region" class="mt-2 w-full" wrapperClass="block text-sm font-medium" />
			<Field
				name="manualValue"
				label="Manual value"
				type="number"
				class="mt-2 w-full"
				wrapperClass="block text-sm font-medium"
				min="0.01"
				step="0.01"
			/>
			<Field name="duration" label="Duration" type="number" class="mt-2 w-full" wrapperClass="block text-sm font-medium" min="0" step="0.01" />
			<Field name="convexity" label="Convexity" type="number" class="mt-2 w-full" wrapperClass="block text-sm font-medium" min="0" step="0.01" />
			<SecondarySubmitButton class="sm:col-span-2">Save risk profile</SecondarySubmitButton>
		</form>
		<div class="mt-5 space-y-2">
			{#each workspace.riskProfiles as profile (profile.id)}
				<div class="flex items-center justify-between rounded-lg border p-3">
					<div>
						<p class="text-sm font-medium">{profile.assetCategory}</p>
						<p class="text-xs text-muted-foreground">Holding {uid(profile.holdingId)}</p>
					</div><NativeButton
						class="text-sm text-danger"
						onclick={() => remove('/scenarios/risk-profiles/' + uid(profile.id), 'Delete this risk profile?')}>Delete</NativeButton
					>
				</div>
			{/each}
		</div>
	</section>
</div>
<div id="scenario-management-error" class="mt-4">
	{#if slot?.kind === 'review'}
		<SnapshotReview snapshot={slot.review.snapshot} values={slot.review.values} {onformerror} {onredirect} />
	{:else if slot?.kind === 'error'}
		<FormErrorBanner message={slot.message} />
	{/if}
</div>
