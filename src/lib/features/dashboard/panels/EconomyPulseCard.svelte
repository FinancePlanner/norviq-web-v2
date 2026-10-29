<script lang="ts">
	// dashboard.EconomyPulseShell / EconomyPulseCard. `vm` undefined = shell;
	// vm.items null = OverviewPanelError (the headlines fetch failed).
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import SkeletonBlock from '#lib/components/norviq/SkeletonBlock.svelte';
	import NewsHeadlineList from '#lib/components/norviq/NewsHeadlineList.svelte';
	import OverviewPanelError from '../activity/OverviewPanelError.svelte';
	import type { EconomyPulseVM } from './types.js';

	let { vm }: { vm?: EconomyPulseVM } = $props();
</script>

<div id="economy-pulse-panel">
	{#if !vm}
		<vigil.Panel class="economy-pulse-panel rounded-lg p-5" titleID="economy-pulse-loading">
			<p class="dash-panel-label">Economy pulse</p>
			<div class="mt-4 space-y-3" aria-hidden="true">
				<SkeletonBlock heightClass="h-10 rounded-xl" />
				<SkeletonBlock heightClass="h-10 rounded-xl" />
				<SkeletonBlock heightClass="h-10 rounded-xl" />
			</div>
		</vigil.Panel>
	{:else if vm.items === null}
		<OverviewPanelError title="Economy pulse" message="Market news is unavailable right now." />
	{:else}
		<vigil.Panel class="economy-pulse-panel rounded-lg p-5" titleID="economy-pulse-title">
			<div class="financial-health-panel-header">
				<p class="dash-panel-label" id="economy-pulse-title">Economy pulse</p>
				<a href="/economy" class="dash-panel-link">Economy</a>
			</div>
			{#if vm.items.length === 0}
				<p class="overview-empty mt-4">No market headlines right now. Check back soon.</p>
			{:else}
				<div class="mt-2">
					<NewsHeadlineList items={vm.items} />
				</div>
			{/if}
		</vigil.Panel>
	{/if}
</div>
