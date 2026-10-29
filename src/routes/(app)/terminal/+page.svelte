<script lang="ts">
	// /terminal (internal/pages/terminal/page.templ). The round-down flag lives
	// above every re-rendered region, so a re-render never resets it.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import SwitchField from '#lib/components/norviq/SwitchField.svelte';
	import Workspace from '#lib/features/planning-tools/terminal/components/Workspace.svelte';
	import AutobuysPanel from '#lib/features/planning-tools/terminal/components/AutobuysPanel.svelte';
	import { setTerminalView } from '#lib/features/planning-tools/terminal/view.svelte.js';
	import type { AutobuysVM, WorkspaceVM } from '#lib/features/planning-tools/terminal/types.js';

	let { data } = $props();

	const view = setTerminalView();
	// Replaced by row actions / autobuy writes (Go: the region's outerHTML swap).
	let workspace = $derived<WorkspaceVM>(data.vm);
	let autobuys = $derived<AutobuysVM>(data.vm.autobuys);
	let workspaceVersion = $state(0);
	let autobuysVersion = $state(0);

	function onworkspace(vm: WorkspaceVM) {
		workspace = vm;
		workspaceVersion++;
	}

	function onpanel(vm: AutobuysVM) {
		autobuys = vm;
		autobuysVersion++;
	}
</script>

<svelte:head>
	<title>{data.vm.copy.title} - Norviq</title>
</svelte:head>

<div class="app-page-content vigil-canvas-page terminal-page">
	<vigil.ModernPageHeader title={data.vm.copy.title} subtitle={data.vm.copy.subtitle} />
	{#if data.vm.loadError}
		<section id="terminal-workspace" aria-label="Terminal scenarios">
			<vigil.Panel class="p-5">
				<p role="alert" class="text-subhead">Terminal sizing is unavailable right now. Try again shortly.</p>
			</vigil.Panel>
		</section>
	{:else}
		<div class="terminal-layout grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
			<div class="min-w-0 space-y-3">
				<SwitchField
					id="terminal-round-down"
					label="Round down to whole shares"
					description="Display only. Saved numbers keep their decimals."
					bind:checked={view.roundDown}
				/>
				{#key workspaceVersion}
					<Workspace vm={workspace} {onworkspace} />
				{/key}
			</div>
			<aside class="min-w-0" aria-label="Autobuys">
				{#key autobuysVersion}
					<AutobuysPanel vm={autobuys} {onpanel} />
				{/key}
			</aside>
		</div>
	{/if}
	<p class="mt-4 text-footnote text-muted-foreground">{data.vm.copy.disclaimer}</p>
</div>
