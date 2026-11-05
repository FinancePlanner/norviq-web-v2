<script lang="ts">
	// The Tools hub: one place for the calculators that otherwise live under
	// Portfolio. Rows open the existing pages, which keep their own Pro gates.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { sidebarIcon } from '#lib/components/shell/nav-icons.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import { toolIsLocked, toolsCatalog } from './catalog.js';

	let { features, billingUnknown }: { features: Record<string, boolean>; billingUnknown: boolean } =
		$props();
</script>

<vigil.CanvasPage
	pageClass="tools-hub-page"
	title={t('Tools')}
	subtitle={t('Calculators and planners for your money, in one place.')}
>
	<vigil.Panel>
		<ul class="nq-list" role="list">
			{#each toolsCatalog as entry (entry.path)}
				{@const Icon = sidebarIcon(entry.path)}
				<li class="nq-row">
					<a
						href={entry.path}
						class="flex min-w-0 flex-1 items-center gap-[var(--space-4)] no-underline"
					>
						<span class="nq-row-icon" aria-hidden="true"><Icon class="h-4 w-4" /></span>
						<div class="nq-row-body">
							<p class="nq-row-title">{t(entry.label)}</p>
							<p class="nq-row-subtitle">{t(entry.question)}</p>
						</div>
						{#if toolIsLocked(entry, features, billingUnknown)}
							<span class="pro-badge pro-badge-sm ml-auto">Pro</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</vigil.Panel>
</vigil.CanvasPage>
