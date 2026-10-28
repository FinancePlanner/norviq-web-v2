<script lang="ts">
	// components.ProGatePage(featureName) — full-page gate (deliberately not a
	// plan chooser: prices live only on /settings/subscription).
	import PrimaryButton from './PrimaryButton.svelte';
	import ProFeatureRow from './ProFeatureRow.svelte';
	import ProGateHero from './ProGateHero.svelte';

	let { featureName }: { featureName: string } = $props();
</script>

<div class="app-page-content vigil-document-page pro-gate-page settings-modern-page">
	<ProGateHero {featureName} />
	<div class="pro-gate-features mt-8 grid gap-3 sm:grid-cols-2">
		<ProFeatureRow title="Research and statements" description="Fundamentals, chart builder, scenarios, and earnings" />
		<ProFeatureRow title="Alerts and bank sync" description="Price targets plus read-only bank connections" />
		<ProFeatureRow title="Q and MCP" description="In-app AI and external tool connections" />
		<ProFeatureRow title="Tax and advanced reports" description="Tax strategy plus scheduled PDF and Excel reports" />
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
			Price, currency and any free-trial terms are shown on the subscription page before you buy. Nothing is charged
			from this screen.
		</p>
		<PrimaryButton href="/settings/subscription" class="mt-6">See plans and pricing</PrimaryButton>
		<p class="mt-4 text-center text-xs text-muted-foreground">Restore purchases from subscription settings.</p>
	</div>
</div>
