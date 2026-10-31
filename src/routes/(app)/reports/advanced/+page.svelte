<script lang="ts">
	// reports.AdvancedPage
	import { enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import {
		CheckboxField,
		Field,
		PrimaryButton,
		SecondarySubmitButton,
		SegmentedControl,
		SelectField,
		SubmitButton,
		TextareaField,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import { reportTabs } from '#lib/features/insights/reports/cards.js';
	import { scheduleState } from '#lib/features/insights/reports/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
	const templateOptions = $derived(vm.templates.map((t) => ({ value: t.id, label: t.input.name })));
	const blockChoices = [
		{ value: 'key_metrics', label: 'Key metrics', checked: true },
		{ value: 'holdings', label: 'Holdings', checked: true },
		{ value: 'allocation', label: 'Allocation', checked: true },
		{ value: 'performance', label: 'Performance', checked: true },
		{ value: 'retirement_forecast', label: 'Retirement', checked: false },
		{ value: 'hypothetical_comparison', label: 'What-if comparison', checked: false }
	];
</script>

<svelte:head>
	<title>Reporting center - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-canvas-page advanced-reporting reports-modern-page">
	<vigil.ModernPageHeader title="Reporting center" />
	<div><SegmentedControl items={reportTabs()} activePath="/reports/advanced" /></div>
	{#if vm.notice}
		<div
			class="mt-5 rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-sm"
			role="status"
		>
			{vm.notice}
		</div>
	{/if}
	{#if vm.error}
		<div
			class="mt-5 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm"
			role="alert"
		>
			{vm.error}
		</div>
	{/if}
	<!-- Unreachable while the route is gated (see Go's comment); kept as the product promise. -->
	{#if !vm.isPro}
		<section class="glass-card mt-6 p-6">
			<p class="font-semibold">Advanced reporting is included with Pro</p>
			<p class="mt-2 max-w-2xl text-sm text-muted-foreground">
				Existing templates and generated files remain readable after a downgrade. Schedules pause
				until Pro is restored.
			</p>
			<PrimaryButton href="/settings/subscription" class="mt-5 inline-flex" fullWidth
				>View Pro</PrimaryButton
			>
		</section>
	{/if}
	<div class="mt-6">
		<vigil.CommandSplit>
			<vigil.CommandSplitMain>
				<vigil.Panel class="rounded-lg p-5 md:p-6" titleID="templates-title">
					<div class="flex items-start justify-between gap-4">
						<div>
							<h2 id="templates-title" class="text-lg font-semibold">Report templates</h2>
							<p class="mt-1 text-sm text-muted-foreground">
								Choose the sections and portfolios each report captures.
							</p>
						</div>
						<span class="text-sm text-muted-foreground">{vm.templates.length} templates</span>
					</div>
					<div class="mt-5 grid gap-3 sm:grid-cols-2">
						{#each vm.templates as item (item.id)}
							<article class="rounded-lg border border-current/10 p-4">
								<div class="flex items-start justify-between gap-3">
									<div>
										<h3 class="font-semibold">{item.input.name}</h3>
										<p class="mt-1 text-sm text-muted-foreground">{item.input.description ?? ''}</p>
									</div>
									<span class="text-xs text-muted-foreground">r{item.revision}</span>
								</div>
								<p class="mt-4 text-xs text-muted-foreground">
									{item.input.blocks?.length ?? 0} sections · {item.input.pageSettings.size} · {item
										.input.pageSettings.orientation}
								</p>
								{#if vm.isPro}
									<form method="post" action="?/runs" class="mt-4" use:enhance={withSpinner()}>
										<input type="hidden" name="template" value={item.id} />
										<div class="flex gap-2">
											<CheckboxField
												name="format"
												label="PDF"
												value="pdf"
												checked
												wrapperClass="text-xs"
											/>
											<CheckboxField
												name="format"
												label="Excel"
												value="xlsx"
												checked
												wrapperClass="text-xs"
											/>
											<SecondarySubmitButton class="ml-auto">Generate now</SecondarySubmitButton>
										</div>
									</form>
								{/if}
							</article>
						{/each}
						{#if vm.templates.length === 0}
							<div
								class="rounded-lg border border-dashed border-current/20 p-8 text-center sm:col-span-2"
							>
								<p class="font-medium">No templates yet</p>
								<p class="mt-2 text-sm text-muted-foreground">
									Create a reusable report layout to begin.
								</p>
							</div>
						{/if}
					</div>
				</vigil.Panel>
			</vigil.CommandSplitMain>
			<vigil.CommandSplitAside>
				<vigil.Panel class="rounded-lg p-5 md:p-6" titleID="builder-title">
					<h2 id="builder-title" class="text-lg font-semibold">New template</h2>
					<form
						method="post"
						action="?/templates"
						class="mt-5 space-y-4"
						use:enhance={withSpinner()}
					>
						<Field
							label="Template name"
							name="name"
							type="text"
							placeholder="Quarterly portfolio review"
							required
							class="w-full"
							wrapperClass="block text-sm"
						/>
						<label class="block text-sm"
							><span class="mb-2 block font-medium">Description</span><TextareaField
								name="description"
								placeholder="Purpose and audience"
								class="min-h-20"
								aria-label="Template description"
							/></label
						>
						<div>
							<p class="text-sm font-medium">Portfolios</p>
							<div class="mt-2 space-y-2">
								{#each vm.portfolios as item (item.id)}
									<label class="flex items-center gap-3 rounded-xl bg-current/5 px-3 py-2 text-sm"
										><CheckboxField
											name="portfolio"
											value={item.id}
											checked={item.mode === 'actual'}
											aria-label={item.name}
										/><span>{item.name}</span><span
											class="ml-auto text-xs text-muted-foreground capitalize">{item.mode}</span
										></label
									>
								{/each}
							</div>
						</div>
						<fieldset>
							<legend class="text-sm font-medium">Sections</legend>
							<div class="mt-2 grid grid-cols-2 gap-2">
								{#each blockChoices as choice (choice.value)}
									<CheckboxField
										name="block"
										label={choice.label}
										value={choice.value}
										checked={choice.checked}
										wrapperClass="rounded-xl bg-current/5 px-3 py-2 text-sm"
									/>
								{/each}
							</div>
						</fieldset>
						<div class="grid grid-cols-2 gap-3">
							<SelectField
								name="theme"
								label="Theme"
								class="w-full"
								wrapperClass="block text-sm"
								options={[
									{ value: 'norviq_light', label: 'Norviq light' },
									{ value: 'midnight', label: 'Midnight' },
									{ value: 'advisor', label: 'Advisor' }
								]}
							/><SelectField
								name="page"
								label="Page"
								class="w-full"
								wrapperClass="block text-sm"
								options={[
									{ value: 'a4', label: 'A4' },
									{ value: 'letter', label: 'Letter' }
								]}
							/>
						</div>
						<SubmitButton fullWidth disabled={!vm.isPro}>Save template</SubmitButton>
					</form>
				</vigil.Panel>
			</vigil.CommandSplitAside>
		</vigil.CommandSplit>
	</div>
	<div class="mt-5 grid gap-5 xl:grid-cols-2">
		<section class="glass-card p-5 md:p-6" aria-labelledby="schedules-title">
			<h2 id="schedules-title" class="text-lg font-semibold">Schedules</h2>
			<div class="mt-4 space-y-3">
				{#each vm.schedules as item (item.id)}
					<div class="rounded-lg bg-current/5 px-4 py-3">
						<div class="flex justify-between gap-3">
							<div>
								<p class="font-medium">{item.input.name}</p>
								<p class="mt-1 text-xs text-muted-foreground capitalize">
									{item.input.recurrence.frequency} · {(item.input.outputFormats ?? []).join(' + ')}
								</p>
							</div>
							<span class="text-xs text-muted-foreground">{scheduleState(item)}</span>
						</div>
					</div>
				{/each}
				{#if vm.schedules.length === 0}
					<p class="text-sm text-muted-foreground">No report schedules.</p>
				{/if}
			</div>
			{#if vm.templates.length > 0 && vm.isPro}
				<form
					method="post"
					action="?/schedules"
					class="mt-5 grid gap-3 sm:grid-cols-2"
					use:enhance={withSpinner()}
				>
					<Field
						label="Schedule name"
						name="name"
						type="text"
						placeholder="Monthly review"
						required
						class="w-full"
						wrapperClass="block text-sm"
					/>
					<SelectField
						name="template"
						label="Template"
						class="w-full"
						wrapperClass="block text-sm"
						options={templateOptions}
					/>
					<SelectField
						name="frequency"
						label="Frequency"
						class="w-full"
						wrapperClass="block text-sm"
						options={[
							{ value: 'monthly', label: 'Monthly' },
							{ value: 'weekly', label: 'Weekly' },
							{ value: 'quarterly', label: 'Quarterly' },
							{ value: 'yearly', label: 'Yearly' }
						]}
					/>
					<Field
						name="time"
						label="Local time"
						type="time"
						value="08:00"
						required
						class="w-full"
						wrapperClass="block text-sm"
					/>
					<div class="flex items-center gap-4 text-sm">
						<CheckboxField name="format" label="PDF" value="pdf" checked /><CheckboxField
							name="format"
							label="Excel"
							value="xlsx"
							checked
						/>
					</div>
					<SecondarySubmitButton>Create schedule</SecondarySubmitButton>
				</form>
			{/if}
		</section>
		<section class="glass-card p-5 md:p-6" aria-labelledby="history-title">
			<h2 id="history-title" class="text-lg font-semibold">Generated files</h2>
			<div class="mt-4 space-y-3">
				{#each vm.runs as run (run.id)}
					<div class="rounded-lg border border-current/10 px-4 py-3">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p class="font-medium capitalize">{run.status.replaceAll('_', ' ')}</p>
								<p class="mt-1 text-xs text-muted-foreground">{run.createdAt}</p>
							</div>
							<div class="flex flex-wrap gap-2">
								{#each run.artifacts ?? [] as artifact (artifact.id)}
									<a
										class="btn-secondary"
										href={'/reports/advanced/artifacts/' + artifact.id}
										data-sveltekit-reload>{artifact.format.toUpperCase()}</a
									>
								{/each}
							</div>
						</div>
						{#if run.failureReason}
							<p class="mt-2 text-xs text-danger">{run.failureReason}</p>
						{/if}
					</div>
				{/each}
				{#if vm.runs.length === 0}
					<p class="text-sm text-muted-foreground">
						Generated PDF and Excel files will appear here for 90 days.
					</p>
				{/if}
			</div>
		</section>
	</div>
	<p class="mt-5 text-xs text-muted-foreground">
		Downloads use private, expiring links. Generated file metadata remains available for one year.
	</p>
</div>
