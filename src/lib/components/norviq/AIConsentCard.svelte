<script lang="ts">
	// components.AIConsentCard(next, dismissible, notNowHref) — posts to
	// /ai-consent with `next`. Dismissible: "Not now" hides the card in place;
	// otherwise it links to notNowHref.
	import AIConsentDisclosure from './AIConsentDisclosure.svelte';
	import NativeButton from './NativeButton.svelte';

	let {
		next,
		dismissible = false,
		notNowHref = '/dashboard',
		action = '/ai-consent'
	}: { next: string; dismissible?: boolean; notNowHref?: string; action?: string } = $props();

	let hidden = $state(false);
</script>

{#if !hidden}
	<!-- role="dialog" on a <section> is the Go markup, kept for parity. -->
	<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
	<section id="ai-consent-card" class="ai-consent-card glass-card p-6" role="dialog" aria-labelledby="ai-consent-title">
		<p class="command-metric-label">AI features</p>
		<h2 id="ai-consent-title" class="mt-2 text-lg font-semibold">Allow Norviq to share data with AI providers?</h2>
		<div class="mt-4">
			<AIConsentDisclosure />
		</div>
		<form method="post" {action} class="mt-6 flex flex-wrap items-center gap-3">
			<input type="hidden" name="next" value={next} />
			<NativeButton type="submit" class="btn-primary px-6">Allow</NativeButton>
			{#if dismissible}
				<NativeButton class="btn-secondary px-6" onclick={() => (hidden = true)}>Not now</NativeButton>
			{:else}
				<a href={notNowHref} class="btn-secondary px-6">Not now</a>
			{/if}
		</form>
	</section>
{/if}
