<script lang="ts">
	// pages/automation/page.templ ScreensPage + ScreenEditor + ScreenConditionRow.
	import { enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import Field from '#lib/components/norviq/Field.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import CheckboxField from '#lib/components/norviq/CheckboxField.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import { withSpinner } from '#lib/components/norviq/form-loading.js';
	import {
		decimal,
		listOptions,
		metricOptions,
		screenAlerts,
		screenEditorTitle,
		screenGroupOperator,
		screenListSelected,
		screenName,
		screenOperator,
		screenSubmitLabel
	} from '#lib/features/portfolio/automation/format.js';
	import type { ScreenMetricDescriptor } from '#lib/features/portfolio/automation/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
	const editing = $derived(vm.editing);
	// screenAction: the Go form posted to /portfolio/screens or /portfolio/screens/{id}.
	const editorAction = $derived(editing ? `/portfolio/screens?id=${encodeURIComponent(editing.id)}&/update` : '/portfolio/screens?/create');
	const screenAct = (id: string, name: string) => `/portfolio/screens?id=${encodeURIComponent(id)}&/${name}`;
	const groupOperatorOptions = (index: number) => [
		{ value: 'all', label: 'All conditions', selected: screenGroupOperator(editing, index) === 'all' },
		{ value: 'any', label: 'Any condition', selected: screenGroupOperator(editing, index) === 'any' }
	];
</script>

<svelte:head>
	<title>Smart screens - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

{#snippet conditionRow(catalog: ScreenMetricDescriptor[], group: number, metricValue: string, periodValue: string, comparisonValue: string, value: string)}
	<div class="grid gap-3 rounded-xl border border-black/5 p-3 dark:border-white/10 md:grid-cols-5 glass-card">
		<SelectField
			name="condition_group"
			label="Group"
			wrapperClass="grid gap-1 text-xs"
			options={[
				{ value: '1', label: '1', selected: group === 1 },
				{ value: '2', label: '2', selected: group === 2 }
			]}
		/>
		<SelectField name="condition_metric" label="Metric" wrapperClass="grid gap-1 text-xs" options={metricOptions(catalog, metricValue)} />
		<SelectField
			name="condition_period"
			label="Period"
			wrapperClass="grid gap-1 text-xs"
			options={[
				{ value: 'ttm', label: 'TTM', selected: periodValue === 'ttm' },
				{ value: 'annual', label: 'Annual', selected: periodValue === 'annual' },
				{ value: 'quarterly', label: 'Quarterly', selected: periodValue === 'quarterly' }
			]}
		/>
		<SelectField
			name="condition_comparison"
			label="Comparison"
			wrapperClass="grid gap-1 text-xs"
			options={[
				{ value: 'improving', label: 'Improving', selected: comparisonValue === 'improving' },
				{ value: 'deteriorating', label: 'Deteriorating', selected: comparisonValue === 'deteriorating' },
				{ value: 'greater_than', label: 'Greater than', selected: comparisonValue === 'greater_than' },
				{ value: 'less_than', label: 'Less than', selected: comparisonValue === 'less_than' }
			]}
		/>
		<Field name="condition_value" label="Value" type="number" {value} placeholder="Numeric only" wrapperClass="grid gap-1 text-xs" step="0.01" />
	</div>
{/snippet}

<div class="app-page-content vigil-deck-page automation-modern-page space-y-6">
	<vigil.ModernPageHeader title="Smart screens" subtitle="Alerts fire only when a stock newly qualifies." />
	{#if vm.error}
		<div class="rounded-xl border border-danger p-4" role="alert">{vm.error}</div>
	{/if}
	<!-- ScreenEditor; keyed so a new ?edit= reseeds the uncontrolled fields -->
	{#key editing}
		<section class="rounded-lg border p-5">
			<div class="flex items-center justify-between gap-4">
				<div>
					<h2 class="font-semibold">{screenEditorTitle(editing)}</h2>
					<p class="mt-1 text-sm text-muted-foreground">Conditions inside a group use its operator; groups use the screen operator.</p>
				</div>
				{#if editing}
					<a class="btn" href="/portfolio/screens">Cancel editing</a>
				{/if}
			</div>
			<form class="mt-4 space-y-5" method="POST" action={editorAction} use:enhance={withSpinner()}>
				<div class="grid gap-4 md:grid-cols-3">
					<Field name="name" label="Name" value={screenName(editing)} required wrapperClass="grid gap-1 text-sm" />
					<SelectField
						name="list_ids"
						label="Watchlists"
						required
						multiple
						class="min-h-24"
						wrapperClass="grid gap-1 text-sm"
						options={listOptions(vm.lists, (id) => screenListSelected(editing, id))}
					/>
					<SelectField
						name="logical_operator"
						label="Match groups"
						wrapperClass="grid gap-1 text-sm"
						options={[
							{ value: 'all', label: 'All groups', selected: screenOperator(editing) === 'all' },
							{ value: 'any', label: 'Any group', selected: screenOperator(editing) === 'any' }
						]}
					/>
					<SelectField name="group_operator_1" label="Group 1 operator" wrapperClass="grid gap-1 text-sm" options={groupOperatorOptions(0)} />
					<SelectField name="group_operator_2" label="Group 2 operator" wrapperClass="grid gap-1 text-sm" options={groupOperatorOptions(1)} />
					<CheckboxField
						name="alerts"
						label="Alert only when a symbol newly qualifies"
						checked={screenAlerts(editing)}
						wrapperClass="flex items-center gap-2 text-sm"
					/>
				</div>
				<div class="space-y-3">
					<h3 class="text-sm font-semibold">Conditions</h3>
					{#if editing}
						{#each editing.groups ?? [] as group, groupIndex (groupIndex)}
							{#each group.conditions ?? [] as condition, ci (ci)}
								{@render conditionRow(vm.catalog, groupIndex + 1, condition.metric, condition.period, condition.comparison, decimal(condition.value))}
							{/each}
						{/each}
					{/if}
					{#each [0, 1, 2, 3] as i (i)}
						{@render conditionRow(vm.catalog, 1, '', 'annual', 'improving', '')}
					{/each}
				</div>
				<SubmitButton class="btn-primary">{screenSubmitLabel(editing)}</SubmitButton>
			</form>
		</section>
	{/key}
	<section class="grid gap-4 md:grid-cols-2">
		{#each vm.screens as screen (screen.id)}
			<article class="glass-card p-5 md:p-6">
				<div class="flex items-start justify-between gap-3">
					<div>
						<h2 class="font-semibold">{screen.name}</h2>
						<p class="text-sm text-muted-foreground">{(screen.groups ?? []).length} group(s) · {screen.logicalOperator}</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<form method="POST" action={screenAct(screen.id, 'evaluate')} use:enhance={withSpinner()}>
							<SubmitButton class="btn-primary">Evaluate</SubmitButton>
						</form><a class="btn" href={'/portfolio/screens?edit=' + screen.id}>Edit</a><a class="btn" href={'/portfolio/screens?history=' + screen.id}
							>History</a
						><form
							method="POST"
							action={screenAct(screen.id, 'delete')}
							use:enhance={withSpinner(({ cancel }) => {
								if (!confirm('Delete this screen and its history?')) cancel();
							})}
						>
							<SubmitButton>Delete</SubmitButton>
						</form>
					</div>
				</div>
			</article>
		{/each}
	</section>
	{#if vm.evaluation}
		<section class="glass-card p-5 md:p-6">
			<h2 class="font-semibold">{(vm.evaluation.matches ?? []).length} of {vm.evaluation.symbolCount} symbols match</h2>
			<div class="mt-3 flex flex-wrap gap-2">
				{#each vm.evaluation.matches ?? [] as match, mi (mi)}
					<a class="rounded-full border px-3 py-1 text-sm" href={'/portfolio/' + match.symbol}>{match.symbol}</a>
				{/each}
			</div>
		</section>
	{/if}
	{#if vm.historyScreenID}
		<section class="glass-card p-5 md:p-6">
			<div class="flex items-center justify-between gap-3">
				<h2 class="font-semibold">Evaluation history</h2>
				<a class="btn" href="/portfolio/screens">Close</a>
			</div>
			<div class="mt-3 space-y-2">
				{#each vm.history as evaluation, ei (ei)}
					<div class="rounded-xl border border-black/5 p-3 dark:border-white/10 glass-card">
						<p class="font-medium">{(evaluation.matches ?? []).length} of {evaluation.symbolCount} matched</p>
						<p class="text-xs text-muted-foreground">{evaluation.evaluatedAt}</p>
						<div class="mt-2 flex flex-wrap gap-2">
							{#each evaluation.matches ?? [] as match, mi (mi)}
								<span class="rounded-full border px-2 py-1 text-xs">{match.symbol}</span>
							{/each}
						</div>
					</div>
				{/each}
				{#if vm.history.length === 0}
					<p class="text-sm text-muted-foreground">No evaluations yet.</p>
				{/if}
			</div>
		</section>
	{/if}
</div>
