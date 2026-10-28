<script lang="ts">
	import { Lock, Sparkles } from '@lucide/svelte';

	// pro_gate.templ: ProGatePage (full page) and ProGateOverlay (inline card).
	let { featureName, variant = 'page' }: { featureName: string; variant?: 'page' | 'overlay' } = $props();

	const rows: [string, string][] = [
		['Research and statements', 'Fundamentals, chart builder, scenarios, and earnings'],
		['Alerts and bank sync', 'Price targets plus read-only bank connections'],
		['Q and MCP', 'In-app AI and external tool connections'],
		['Tax and advanced reports', 'Tax strategy plus scheduled PDF and Excel reports']
	];
</script>

{#if variant === 'overlay'}
	<div class="pro-gate-overlay pro-gate-card glass-card">
		<div class="pro-gate-lock" aria-hidden="true"><Lock class="h-8 w-8" /></div>
		<p class="pro-gate-eyebrow">Pro feature</p>
		<h2 class="pro-gate-title">{featureName}</h2>
		<p class="pro-gate-desc">Subscribe to unlock this feature.</p>
		<p class="pro-gate-terms">Price and trial terms are shown on the subscription page, before any purchase.</p>
		<a href="/settings/subscription" class="btn-primary pro-gate-cta mt-6 inline-flex px-8">See plans</a>
	</div>
{:else}
	<div class="app-page-content vigil-document-page pro-gate-page settings-modern-page">
		<div class="pro-gate-hero glass-card p-8 text-center md:p-10">
			<span class="pro-badge">Pro</span>
			<h1 class="mt-4 text-3xl font-bold md:text-4xl">{featureName}</h1>
			<p class="mx-auto mt-3 max-w-lg text-base text-muted-foreground">
				Get full clarity on your net worth and make better decisions with Norviq Pro.
			</p>
		</div>
		<div class="pro-gate-features mt-8 grid gap-3 sm:grid-cols-2">
			{#each rows as [title, description] (title)}
				<div class="pro-feature-row rounded-lg p-4">
					<div class="flex items-start gap-3">
						<span class="pro-feature-icon" aria-hidden="true"><Sparkles class="h-4 w-4" /></span>
						<div>
							<p class="font-semibold">{title}</p>
							<p class="mt-1 text-sm text-muted-foreground">{description}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
		<div class="pro-gate-plans glass-card mt-8 p-6 md:p-8">
			<p class="field-label">Billing intervals</p>
			<div class="pro-plan-cards mt-4 grid gap-3 md:grid-cols-2">
				<div class="pro-plan-card rounded-lg p-4">
					<p class="text-sm font-bold">Annual</p>
					<p class="mt-2 text-sm text-muted-foreground">Billed yearly · cancel anytime</p>
				</div>
				<div class="pro-plan-card rounded-lg p-4">
					<p class="text-sm font-bold">Monthly</p>
					<p class="mt-2 text-sm text-muted-foreground">Billed monthly · cancel anytime</p>
				</div>
			</div>
			<p class="pro-gate-terms mt-4">
				Price, currency and any free-trial terms are shown on the subscription page before you buy. Nothing is
				charged from this screen.
			</p>
			<a href="/settings/subscription" class="btn-primary mt-6">See plans and pricing</a>
			<p class="mt-4 text-center text-xs text-muted-foreground">Restore purchases from subscription settings.</p>
		</div>
	</div>
{/if}
