<script lang="ts">
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import DestinationRows from '#lib/components/shell/DestinationRows.svelte';
	import { t } from '#lib/i18n/context.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{t('More')} - Norviq</title>
</svelte:head>

<vigil.DocumentPage pageClass="more-page" title={t('More')}>
	<div class="flex flex-col gap-8">
		{#each data.sections as section (section.title)}
			<vigil.Section title={section.title}>
				{#snippet action()}
					{#if section.indexPath}
						<a href={section.indexPath} class="link-tint text-subhead font-semibold"
							>{t('All in %s →', section.title)}</a
						>
					{/if}
				{/snippet}
				<DestinationRows items={section.items} />
			</vigil.Section>
		{/each}
	</div>
</vigil.DocumentPage>
