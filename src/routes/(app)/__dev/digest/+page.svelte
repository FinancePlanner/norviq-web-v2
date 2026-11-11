<script lang="ts">
	// DEV ONLY preview of the digest page with sample data (see +page.ts).
	import DigestView from '#lib/features/digest/DigestView.svelte';
	import { t } from '#lib/i18n/context.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{t('Weekly digest')} - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page digest-page">
	<DigestView vm={data.vm} focus={data.focus} />
</div>
