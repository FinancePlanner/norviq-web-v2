<script lang="ts">
	// GET /portfolio/import/screenshot. Go returned ScreenshotImportPanel as a bare
	// fragment (no page links to it); here it renders inside the app shell.
	import { AIConsentPage } from '#lib/components/norviq/index.js';
	import ScreenshotImportPanel from '#lib/features/portfolio/workspace/ScreenshotImportPanel.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const preview = $derived(form && 'screenshot' in form && form.screenshot ? form.screenshot : data.vm);
	const consentNext = $derived(form && 'consentCard' in form ? (form.consentCard ?? '') : '');
</script>

<svelte:head>
	<title>{data.consentRequired ? 'Allow AI features - Norviq' : 'Import from screenshots - Norviq'}</title>
</svelte:head>

{#if data.consentRequired}
	<AIConsentPage next={data.next} />
{:else}
	<div class="app-page-content portfolio-modern-page">
		<ScreenshotImportPanel vm={data.vm} {preview} {consentNext} />
	</div>
{/if}
