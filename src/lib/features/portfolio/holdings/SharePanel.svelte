<script lang="ts">
	// pages/portfolio/onepage.templ SharePanel. Go swapped this section in place
	// on hx-post / hx-delete /portfolio/one-page/share-link; the endpoints now
	// answer the ShareLinkVM and the panel re-renders from it.
	import { PrimaryButton, SecondaryButton } from '#lib/components/norviq/index.js';
	import type { ShareLinkVM } from './types.js';

	let { vm: initial }: { vm: ShareLinkVM } = $props();

	// svelte-ignore state_referenced_locally
	let vm = $state(initial);
	$effect.pre(() => {
		vm = initial;
	});

	async function request(method: 'POST' | 'DELETE', url: string) {
		try {
			const res = await fetch(url, { method, headers: { accept: 'application/json' } });
			// htmx dropped 4xx/5xx (noSwap); so does this.
			if (res.ok) vm = (await res.json()) as ShareLinkVM;
		} catch {
			/* network failure: nothing swapped, as with htmx */
		}
	}

	function norviqShare(url: string) {
		if (navigator.share) {
			navigator.share({ title: 'My portfolio on Norviq', url }).catch(() => {});
			return;
		}
		navigator.clipboard.writeText(url);
	}
</script>

<section id="share-panel" class="rounded-[var(--radius)] border p-4">
	<h2 class="font-medium">Share</h2>
	<p class="text-sm text-muted-foreground">People with the link see weights and returns only — never amounts.</p>
	{#if vm.error !== ''}
		<p class="mt-2 text-sm text-danger" role="alert">{vm.error}</p>
	{/if}
	{#if vm.url === ''}
		<div class="mt-3">
			<PrimaryButton onclick={() => request('POST', '/portfolio/one-page/share-link?portfolio=' + vm.scope)}>
				Create public link
			</PrimaryButton>
		</div>
	{:else}
		<p class="mt-3 break-all rounded-[var(--radius-control)] border px-3 py-2 text-sm select-all" data-share-url>{vm.url}</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<PrimaryButton data-share-url={vm.url} onclick={() => norviqShare(vm.url)}>Share</PrimaryButton>
			<SecondaryButton href={vm.url} target="_blank" rel="noopener">Preview</SecondaryButton>
			<SecondaryButton onclick={() => request('DELETE', '/portfolio/one-page/share-link?portfolio=' + vm.scope)}>
				Stop sharing
			</SecondaryButton>
		</div>
	{/if}
	{#if vm.others.length > 0}
		<div class="mt-4 border-t pt-3" data-share-others>
			<p class="text-sm text-muted-foreground">Also shared</p>
			{#each vm.others as other (other.scope)}
				<div class="mt-2 flex items-center justify-between gap-3">
					<span class="min-w-0 break-all text-sm">{other.label} · {other.url}</span>
					<SecondaryButton
						onclick={() => request('DELETE', '/portfolio/one-page/share-link?portfolio=' + vm.scope + '&revoke=' + other.scope)}
					>
						Stop
					</SecondaryButton>
				</div>
			{/each}
		</div>
	{/if}
</section>
