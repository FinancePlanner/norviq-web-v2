<script lang="ts">
	// dashboard.OverviewSetupPanel. "Record expense" dispatches openQuickExpense
	// like the Alpine $dispatch; on /dashboard/pulse there is no modal listening,
	// exactly as in Go.
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
</script>

<section class="dash-panel overview-setup-panel p-5 md:p-6">
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<p class="dash-panel-label">Finish setup</p>
			<h2 class="mt-2 text-xl font-semibold">Build a useful overview in three moves</h2>
			<p class="mt-2 max-w-2xl text-sm text-muted-foreground">
				Add holdings, record a recent expense, and set one focus goal so the dashboard can show
				portfolio, spending, and habit context.
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<a href="/portfolio?add=position" class="instrument-action">Add holding</a>
			<NativeButton
				class="dash-btn dash-btn-secondary"
				onclick={() => window.dispatchEvent(new CustomEvent('openQuickExpense'))}
			>
				Record expense
			</NativeButton>
			<a href="/dashboard/insights" class="dash-btn dash-btn-ghost">Set goal</a>
		</div>
	</div>
</section>
