<script lang="ts">
	// components.ToastBanner(message) — the inline success banner (not a toast popup).
	let { message = '' }: { message?: string | null } = $props();
</script>

{#if message}
	<div class="success-banner" role="status">
		{message}
	</div>
{/if}
