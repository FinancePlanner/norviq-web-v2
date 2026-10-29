<script lang="ts">
	// dashboard.FocusPointIcon(point)
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import type { FocusPointVM } from '../types.js';

	let { point }: { point: FocusPointVM } = $props();
</script>

{#if point.isSystem}
	{#if point.isCompleted}
		<span class="focus-point-icon focus-point-icon-system-done" aria-hidden="true">
			<Icon name="circle-check" class="h-5 w-5" />
		</span>
	{:else}
		<span class="focus-point-icon focus-point-icon-system" aria-hidden="true">
			<Icon name="circle-dot" class="h-5 w-5" />
		</span>
	{/if}
{:else if point.isCompleted}
	<span class="focus-point-icon focus-point-icon-done" aria-hidden="true">
		<Icon name="check" class="h-5 w-5" />
	</span>
{:else}
	<span class="focus-point-icon focus-point-icon-pending" aria-hidden="true">
		<Icon name="circle" class="h-5 w-5" />
	</span>
{/if}
