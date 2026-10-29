<script lang="ts">
	// dashboard.OverviewPanelError(title, message). Pass translated strings.
	let { title, message }: { title: string; message: string } = $props();
</script>

<div class="dash-panel overview-panel-error">
	<div class="financial-health-panel-header">
		<p class="dash-panel-label">{title}</p>
	</div>
	<p class="overview-empty mt-4">{message}</p>
</div>
