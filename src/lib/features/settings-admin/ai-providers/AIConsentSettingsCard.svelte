<script lang="ts">
	// settings.AIConsentCard (ai_providers.templ) — not the kit's
	// components.AIConsentCard. Withdrawing stops every AI feature at once.
	import { AIConsentDisclosure, NativeButton } from '#lib/components/norviq/index.js';
	import type { AIConsentVM } from './providers.js';

	let { vm }: { vm: AIConsentVM } = $props();
</script>

<section id="ai-data-sharing" class="glass-card ai-consent-settings mb-6 p-6">
	<h2 class="text-lg leading-none font-semibold tracking-tight">AI data sharing</h2>
	{#if vm.message !== ''}
		<p class="mt-3 text-sm" role="status">{vm.message}</p>
	{/if}
	{#if !vm.known}
		<p class="mt-2 text-sm text-muted-foreground">Couldn't load your AI consent right now. Try again shortly.</p>
	{:else if vm.granted}
		<p class="mt-2 text-sm text-muted-foreground">
			Allowed
			{#if vm.since !== ''}
				since {vm.since}
			{/if}
			. AI features (assistant, insights, summaries, AI imports) send the financial context they need to Anthropic and
			OpenRouter. Your name, email and user ID are not sent, and your data is not used to train models.
		</p>
		<form method="post" action="/settings/ai-consent/revoke" class="mt-4">
			<NativeButton type="submit" class="btn-secondary px-5">Stop sharing and turn off AI features</NativeButton>
		</form>
	{:else}
		<p class="mt-2 text-sm text-muted-foreground">Not allowed. AI features stay off and nothing is sent to AI providers.</p>
		<div class="mt-4">
			<AIConsentDisclosure />
		</div>
		<form method="post" action="/ai-consent" class="mt-4">
			<input type="hidden" name="next" value="/settings/ai-providers" />
			<NativeButton type="submit" class="btn-primary px-5">Allow AI features</NativeButton>
		</form>
	{/if}
	<p class="mt-3 text-xs text-muted-foreground">
		<a href="/privacy#ai" class="underline" target="_blank" rel="noopener">How Norviq uses AI</a>
	</p>
</section>
