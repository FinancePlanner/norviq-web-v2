<script lang="ts">
	// groups.templ notices(notice, errorText).
	import { FormErrorBanner } from '#lib/components/norviq/index.js';

	let { notice = '', error = '' }: { notice?: string; error?: string } = $props();
</script>

{#if notice}
	<p class="mb-4 rounded-[var(--radius)] border border-[var(--color-border)] px-4 py-3 text-sm" role="status" data-groups-notice>{notice}</p>
{/if}
{#if error}
	<div class="mb-4">
		<FormErrorBanner message={error} />
	</div>
{/if}
