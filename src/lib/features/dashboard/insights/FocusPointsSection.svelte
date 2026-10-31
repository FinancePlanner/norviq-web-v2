<script lang="ts">
	// dashboard.FocusPointsSection + FocusPointsBody. Go swapped
	// #focus-points-body with whatever each goals endpoint rendered; here every
	// form posts a /dashboard/insights action whose result (fresh points +
	// goalsError) becomes the page's `form`, which the page passes back in as
	// `points`/`goalsError`. invalidateAll is off so a toggle does not re-run
	// the page load (and with it the AI insights).
	import { tick } from 'svelte';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { t } from '#lib/i18n/context.svelte.js';
	import { withSpinner } from '#lib/components/norviq/form-loading.js';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import type { FocusPointVM } from '../types.js';
	import FocusPointEditForm from './FocusPointEditForm.svelte';
	import FocusPointRow from './FocusPointRow.svelte';

	let {
		points,
		goalsError = false
	}: { points: FocusPointVM[] | null | undefined; goalsError?: boolean } = $props();

	/** The row in edit mode (Go: GET /dashboard/insights/goals/{id}/edit). */
	let editingID = $state<string | null>(null);
	let deleteForm = $state<HTMLFormElement | null>(null);
	let deleteID = $state('');

	const submit: SubmitFunction = withSpinner(() => async ({ update }) => {
		await update({ invalidateAll: false });
		editingID = null;
	});

	async function onDelete(point: FocusPointVM) {
		// hx-confirm="Remove this focus point?"
		if (!confirm(t('Remove this focus point?'))) return;
		deleteID = point.id;
		await tick();
		deleteForm?.requestSubmit();
	}
</script>

<div id="focus-points" class="dash-panel focus-points-card p-4 md:p-5">
	<p class="dash-panel-label">{t('Focus this week')}</p>
	<div id="focus-points-body">
		<form
			class="focus-points-form mt-4"
			method="POST"
			action="/dashboard/insights?/create"
			use:enhance={submit}
		>
			<div class="focus-points-input-row">
				<input
					type="text"
					name="title"
					class="field-input focus-points-input"
					placeholder={t('Add a focus point')}
					required
					autocomplete="off"
				/>
				<SubmitButton class="focus-points-add-btn">{t('Add')}</SubmitButton>
			</div>
		</form>
		{#if goalsError}
			<p class="focus-points-error mt-3 text-sm">{t('Focus points unavailable right now.')}</p>
		{:else if !points || points.length === 0}
			<p class="overview-empty mt-4">
				{t('No focus points yet. Add one to start tracking this week.')}
			</p>
		{:else}
			<ul class="focus-points-list mt-4 space-y-2">
				{#each points as point (point.id)}
					{#if editingID === point.id && point.canManage}
						<FocusPointEditForm {point} {submit} oncancel={() => (editingID = null)} />
					{:else}
						<FocusPointRow
							{point}
							showActions
							toggleEnhance={submit}
							onedit={(p) => (editingID = p.id)}
							ondelete={onDelete}
						/>
					{/if}
				{/each}
			</ul>
		{/if}
		<form
			bind:this={deleteForm}
			method="POST"
			action="/dashboard/insights?/delete"
			use:enhance={submit}
			hidden
		>
			<input type="hidden" name="id" value={deleteID} />
		</form>
	</div>
</div>
