<script lang="ts">
	// dashboard.FocusPointRow(point, showActions).
	//
	// With `toggleEnhance` (the insights page) the row's form posts the
	// `?/toggle` action. Without it (the dashboard teaser) the form is inert:
	// in Go its hx-target #focus-points-body does not exist on /dashboard/pulse,
	// so htmx refused the request with a targetError. Ported as-is.
	import { enhance, type SubmitFunction } from '$app/forms';
	import { t } from '#lib/i18n/context.svelte.js';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import type { FocusPointVM } from '../types.js';
	import FocusPointIcon from './FocusPointIcon.svelte';

	let {
		point,
		showActions = false,
		toggleEnhance,
		onedit,
		ondelete
	}: {
		point: FocusPointVM;
		showActions?: boolean;
		toggleEnhance?: SubmitFunction;
		onedit?: (point: FocusPointVM) => void;
		ondelete?: (point: FocusPointVM) => void;
	} = $props();

	const titleClass = $derived(
		point.isCompleted && !point.isSystem
			? 'focus-point-title focus-point-title-done'
			: 'focus-point-title'
	);
</script>

<li id={'focus-point-' + point.id} class="focus-point-row">
	<div class="focus-point-row-inner">
		{#if point.canToggle}
			{#if toggleEnhance}
				<form
					class="focus-point-toggle-form min-w-0 flex-1"
					method="POST"
					action="/dashboard/insights?/toggle"
					use:enhance={toggleEnhance}
				>
					<input type="hidden" name="id" value={point.id} />
					<NativeButton type="submit" class="focus-point-toggle-btn">
						<FocusPointIcon {point} />
						<span class={titleClass}>{point.title}</span>
					</NativeButton>
				</form>
			{:else}
				<form class="focus-point-toggle-form min-w-0 flex-1" onsubmit={(e) => e.preventDefault()}>
					<NativeButton type="submit" class="focus-point-toggle-btn">
						<FocusPointIcon {point} />
						<span class={titleClass}>{point.title}</span>
					</NativeButton>
				</form>
			{/if}
		{:else}
			<div class="focus-point-static min-w-0 flex-1">
				<FocusPointIcon {point} />
				<span class={titleClass}>{point.title}</span>
			</div>
		{/if}
		{#if showActions && point.canManage}
			<div class="focus-point-actions">
				<NativeButton
					class="focus-point-action-btn"
					aria-label={t('Edit focus point')}
					onclick={() => onedit?.(point)}>{t('Edit')}</NativeButton
				>
				<NativeButton
					class="focus-point-action-btn focus-point-action-btn-danger"
					aria-label={t('Delete focus point')}
					onclick={() => ondelete?.(point)}>{t('Delete')}</NativeButton
				>
			</div>
		{/if}
	</div>
</li>
