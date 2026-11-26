<script lang="ts">
	import RetirePage from '#lib/features/planning-tools/planning/RetirePage.svelte';
	import { t } from '#lib/i18n/context.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{t('Retirement')} - Norviq</title>
</svelte:head>

<RetirePage vm={data.vm} />
