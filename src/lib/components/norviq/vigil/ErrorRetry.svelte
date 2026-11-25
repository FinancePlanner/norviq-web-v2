<script lang="ts">
	// vigil.ErrorRetry: an inline error with a retry. Default retry reloads the page data.
	import { invalidateAll } from '$app/navigation';
	import { t } from '#lib/i18n/context.svelte.js';
	import SecondaryButton from '../SecondaryButton.svelte';

	let {
		title,
		message,
		retryLabel,
		onRetry = invalidateAll
	}: {
		title?: string;
		message: string;
		retryLabel?: string;
		onRetry?: () => void | Promise<void>;
	} = $props();

	let pending = $state(false);

	async function retry() {
		if (pending) return;
		pending = true;
		try {
			await onRetry();
		} finally {
			pending = false;
		}
	}
</script>

<div role="alert" class="vigil-error-retry">
	<p class="vigil-error-retry-title">{title ?? t('Something went wrong')}</p>
	<p class="vigil-error-retry-message">{message}</p>
	<SecondaryButton onclick={retry} loading={pending} disabled={pending}>
		{retryLabel ?? t('Try again')}
	</SecondaryButton>
</div>

<style>
	.vigil-error-retry {
		display: grid;
		justify-items: start;
		gap: var(--space-2);
		padding: var(--space-4);
	}
	.vigil-error-retry-title {
		margin: 0;
		font-weight: 600;
	}
	.vigil-error-retry-message {
		margin: 0;
		color: var(--muted-foreground);
	}
</style>
