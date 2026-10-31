<script lang="ts">
	import { Icon } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);

	// formatPct: clamp to 0–100 and print "%.0f%%".
	function fillStyle(pct: number): string {
		const clamped = Math.min(100, Math.max(0, pct));
		return `width:${clamped.toFixed(0)}%`;
	}
</script>

<svelte:head>
	<title>Badges - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-modern-page settings-section-page">
	<vigil.SettingsShell backHref="/settings" backLabel={t('← Settings')} title="Badges">
		{#if vm.hasLoadError}
			<div class="glass-card mt-6 p-6" role="alert">
				<p class="font-semibold">Could not load badges</p>
				<p class="mt-2 text-sm text-muted-foreground">{vm.errorMessage}</p>
			</div>
		{:else}
			<div class="settings-badges-summary glass-card mt-6 p-6 text-center">
				<p class="text-3xl font-bold">{vm.earnedTiers}</p>
				<p class="text-sm text-muted-foreground">of {vm.totalTiers} tiers earned</p>
				{#if vm.totalTiers > 0}
					<div class="settings-badge-track mt-4" aria-hidden="true">
						<div class="settings-badge-fill" style={fillStyle(vm.progressPct)}></div>
					</div>
				{/if}
			</div>
			<div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each vm.badges as badge, i (i)}
					<div
						class={[
							'badge-card glass-card p-5 text-center',
							badge.unlocked ? 'badge-card-unlocked' : 'opacity-80'
						]}
					>
						<span class="badge-icon" aria-hidden="true">
							<Icon name={badge.unlocked ? 'badge-check' : 'circle-dashed'} class="h-7 w-7" />
						</span>
						<p class="mt-3 font-semibold">{badge.title}</p>
						<p class="mt-1 text-sm text-muted-foreground">{badge.description}</p>
						<p class="mt-3 text-xs font-semibold text-muted-foreground">{badge.tierLabel}</p>
						{#if badge.progressText !== ''}
							<p class="mt-1 text-sm text-muted-foreground">{badge.progressText}</p>
						{/if}
						{#if badge.progressPct > 0 && !badge.unlocked}
							<div class="settings-badge-track mt-3" aria-hidden="true">
								<div class="settings-badge-fill" style={fillStyle(badge.progressPct)}></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</vigil.SettingsShell>
</div>
