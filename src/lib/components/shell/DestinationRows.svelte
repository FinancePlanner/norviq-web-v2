<script lang="ts">
	// Destination rows for the domain index pages and /more: icon, name, the
	// one-line description when there is one, and the Pro badge when locked.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import type { NavItemVM } from '#lib/nav/visible.js';
	import { sidebarIcon } from './nav-icons.js';

	let { items }: { items: (NavItemVM & { description?: string })[] } = $props();
</script>

<vigil.InsetList>
	{#each items as item (item.path)}
		{@const Icon = sidebarIcon(item.path)}
		<li class="nq-row">
			<a
				href={item.path}
				class="flex min-w-0 flex-1 items-center gap-[var(--space-4)] no-underline"
			>
				<span class="nq-row-icon" aria-hidden="true"><Icon class="h-4 w-4" /></span>
				<div class="nq-row-body">
					<p class="nq-row-title">{item.label}</p>
					{#if item.description}<p class="nq-row-subtitle">{item.description}</p>{/if}
				</div>
				{#if item.showProBadge}
					<span class="pro-badge pro-badge-sm ml-auto">Pro</span>
				{/if}
			</a>
		</li>
	{/each}
</vigil.InsetList>
