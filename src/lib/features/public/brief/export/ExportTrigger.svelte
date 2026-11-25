<script lang="ts">
	// Opens the Export Studio. A plain link to the social image, so it works
	// without JS; with JS a plain click loads the studio chunk on demand and
	// opens it. Only a type is imported from the studio, so
	// none of it is in the brief route's static graph. Styled as a ShareBar
	// button, at the 44 px target size. rel=nofollow keeps crawlers from
	// triggering cold renders of the social image.
	import type { Component } from 'svelte';
	import type { StudioProps } from './ExportStudio.svelte';

	let { href, label, studio }: { href: string; label: string; studio: Omit<StudioProps, 'open'> } =
		$props();

	let Studio = $state.raw<Component<StudioProps, object, 'open'>>();
	let open = $state(false);

	async function onclick(event: MouseEvent & { currentTarget: HTMLAnchorElement }) {
		if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		// The dialog returns focus to whatever had it when it opened; Safari does not
		// focus a clicked link, so focus it here.
		event.currentTarget.focus();
		try {
			Studio ??= (await import('./ExportStudio.svelte')).default;
		} catch {
			// The chunk failed to load (offline, or a deploy replaced it): open the image.
			location.assign(href);
			return;
		}
		open = true;
	}
</script>

<a
	{href}
	rel="nofollow"
	class="mt-3 inline-flex min-h-11 items-center rounded-lg border border-border px-3 py-1.5 text-sm"
	data-export-trigger
	{onclick}
>
	{label}
</a>
{#if Studio}
	<Studio {...studio} bind:open />
{/if}
