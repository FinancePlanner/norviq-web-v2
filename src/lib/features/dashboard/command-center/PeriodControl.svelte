<script lang="ts">
	// dashboard.PeriodControl: plain links, the range lives in the URL.
	import type { PeriodOptionVM } from './types.js';

	let { options }: { options: PeriodOptionVM[] } = $props();
</script>

<nav class="cc-range-control" aria-label="Time range">
	{#each options as opt (opt.key)}
		<a
			href={opt.href}
			class="cc-range-option"
			data-active={opt.active ? 'true' : 'false'}
			aria-current={opt.active ? 'page' : undefined}
		>
			{opt.label}
		</a>
	{/each}
</nav>
