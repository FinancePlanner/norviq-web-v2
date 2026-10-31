<script lang="ts">
	// components.FormErrorBanner(message) — renders nothing when message is empty.
	import CircleAlert from '@lucide/svelte/icons/circle-alert';

	let { message = '' }: { message?: string | null } = $props();
</script>

{#if message}
	<div class="error-banner" role="alert" aria-live="assertive">
		<span class="error-banner-icon" aria-hidden="true"
			><CircleAlert class="h-4 w-4" data-lucide="icon" /></span
		>
		<span class="error-banner-text">{message}</span>
	</div>
{/if}
