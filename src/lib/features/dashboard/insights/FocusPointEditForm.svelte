<script lang="ts">
	// dashboard.FocusPointEditForm(point): the row swapped into edit mode
	// (Go: GET /dashboard/insights/goals/{id}/edit). Save posts ?/update;
	// Cancel returns to the list (Go re-fetched /dashboard/insights/focus-points).
	import { enhance, type SubmitFunction } from '$app/forms';
	import { t } from '#lib/i18n/context.svelte.js';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import type { FocusPointVM } from '../types.js';

	let {
		point,
		submit,
		oncancel
	}: { point: FocusPointVM; submit: SubmitFunction; oncancel: () => void } = $props();
</script>

<li id={'focus-point-' + point.id} class="focus-point-row focus-point-row-editing">
	<form
		class="focus-point-edit-form"
		method="POST"
		action="/dashboard/insights?/update"
		use:enhance={submit}
	>
		<input type="hidden" name="id" value={point.id} />
		<input
			type="text"
			name="title"
			class="field-input focus-point-edit-input"
			value={point.title}
			required
			autocomplete="off"
		/>
		<div class="focus-point-edit-actions">
			<SubmitButton class="focus-point-save-btn">{t('Save')}</SubmitButton>
			<NativeButton class="focus-point-action-btn" onclick={oncancel}>{t('Cancel')}</NativeButton>
		</div>
	</form>
</li>
