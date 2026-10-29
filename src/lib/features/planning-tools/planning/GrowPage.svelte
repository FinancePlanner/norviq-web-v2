<script lang="ts">
	// planning.GrowPage(vm) — internal/pages/planning/grow.templ. Rendered by
	// GET /planning/grow and, after a no-JS post, by POST /planning/grow/preview.
	import { enhance } from '$app/forms';
	import { Field, SubmitButton, SwitchField } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import GrowResultPanel from './GrowResultPanel.svelte';
	import { previewEnhance } from './preview-enhance.js';
	import { growPrefillHint, type GrowViewModel } from './vm.js';

	let { vm }: { vm: GrowViewModel } = $props();

	// hx-target="#grow-result": a preview replaces the results panel only.
	let swapped = $state<GrowViewModel | null>(null);
	const resultVM = $derived(swapped ?? vm);
	let resultEl = $state<HTMLElement | null>(null);
</script>

<vigil.CanvasPage
	pageClass="planning-grow-page"
	title="Grow"
	subtitle="What an investment plan becomes, under assumptions you can see and change."
>
	{#if vm.error}
		<div
			class="mb-4 rounded-[var(--radius-control)] border border-destructive/40 bg-destructive/10 px-4 py-3 text-footnote text-destructive"
			role="alert"
		>
			{vm.error}
		</div>
	{/if}
	{#if vm.notice}
		<div class="mb-4 rounded-[var(--radius-control)] border border-border bg-muted/40 px-4 py-3 text-footnote" role="status">
			{vm.notice}
		</div>
	{/if}
	<div class="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
		<vigil.Panel titleID="grow-form-title">
			<vigil.PanelHeader
				id="grow-form-title"
				title="Your plan"
				desc="Every assumption is editable, and shown in the results rather than hidden."
			/>
			<form
				method="post"
				action="/planning/grow/preview"
				class="flex flex-col gap-4"
				use:enhance={previewEnhance<{ vm: GrowViewModel }>(
					() => resultEl,
					(data) => (swapped = data.vm)
				)}
			>
				<Field
					name="initialAmount"
					label="Starting amount"
					type="number"
					value={vm.draft.initialAmount}
					description={growPrefillHint(vm)}
					min="0"
					step="100"
				/>
				<Field
					name="monthlyContribution"
					label="Monthly contribution"
					type="number"
					value={vm.draft.monthlyContribution}
					min="0"
					step="50"
				/>
				<div class="grid gap-4 sm:grid-cols-2">
					<Field name="years" label="Years" type="number" value={vm.draft.years} min="0" max="100" step="1" />
					<Field
						name="returnPercent"
						label="Expected return (%)"
						type="number"
						value={vm.draft.returnPercent}
						min="-99"
						max="100"
						step="0.5"
					/>
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<Field
						name="contributionGrowth"
						label="Contribution rises (%/yr)"
						type="number"
						value={vm.draft.contributionGrowth}
						description="Applied once a year, after the first."
						min="0"
						max="100"
						step="0.5"
					/>
					<Field
						name="inflationPercent"
						label="Inflation (%)"
						type="number"
						value={vm.draft.inflationPercent}
						min="-99"
						max="100"
						step="0.1"
					/>
				</div>
				<SwitchField
					name="adjustForInflation"
					label="Show in today's money"
					value="1"
					checked={vm.draft.adjustForInflation}
					description="Deflates the result by inflation, so the number means what it would buy today."
				/>
				<div class="flex gap-3">
					<SubmitButton class="w-auto px-6">Project</SubmitButton>
				</div>
			</form>
		</vigil.Panel>
		<div id="grow-result" bind:this={resultEl}>
			<GrowResultPanel vm={resultVM} />
		</div>
	</div>
</vigil.CanvasPage>
