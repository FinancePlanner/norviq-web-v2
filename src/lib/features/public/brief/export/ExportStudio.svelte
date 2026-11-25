<script lang="ts" module>
	import type { ExportStrings } from '../edition/strings.js';
	import type { ExportFormat } from './types.js';

	export type { ExportStrings };

	export interface StudioProps {
		open: boolean;
		/** Root-relative /brief/{d}/{s}/exports.json[?lang=pt-PT]. */
		exportsURL: string;
		/** Unversioned root-relative export URLs, for when the manifest is unavailable. */
		fallback: Record<ExportFormat, string>;
		copyURL: string;
		nativeURL: string;
		title: string;
		/** JSON object string (vm.shareProps). */
		eventProps: string;
		text: ExportStrings;
	}
</script>

<script lang="ts">
	// The brief's Export Studio: the Go-rendered social image, story, PDF report
	// and link preview, each to preview, download or share. Loaded on demand by
	// ExportTrigger, so none of it is in the brief route's static graph.
	//
	// Bundle shape (size-budget.mjs): Rolldown chunks a module by the set of
	// entries that reach it, this lazy chunk included. So the studio imports only
	// what is already a whole shared chunk (tui/dialog, the tui Icon registry,
	// the norviq buttons) or what nothing eager uses. A module it shares with
	// only part of an eager chunk is split into a chunk of its own that every
	// route then loads: a direct `@lucide/svelte/icons/file-text` import split
	// the icon out of the registry's chunk (+~340 B gz on every route), and
	// bits-ui's dialog and tabs pulled the bits-ui internals the expenses
	// page's dropdown menu inlines into a shared chunk (+~1.4 KB gz there).
	// Previews and the share sheet use the manifest's versioned URLs, and fall
	// back to the unversioned one when that fails (superseded revision, or no
	// manifest). Downloads and Open always use the unversioned URL: a link the
	// browser follows on its own has no fallback, and the backend 404s a
	// superseded revision.
	import XIcon from '@lucide/svelte/icons/x';
	import PrimaryButton from '#lib/components/norviq/PrimaryButton.svelte';
	import SecondaryButton from '#lib/components/norviq/SecondaryButton.svelte';
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import * as dialog from '#lib/components/norviq/tui/dialog/index.js';
	import { exportFileName, fetchExport, formatURL, trackExport } from './studio.js';
	import type { WebExportManifest } from './types.js';

	let {
		open = $bindable(false),
		exportsURL,
		fallback,
		copyURL,
		nativeURL,
		title,
		eventProps,
		text
	}: StudioProps = $props();

	type Tab = 'social' | 'story' | 'pdf' | 'link';
	type Image = 'social' | 'story' | 'og';
	const SIZE: Record<Image, [number, number]> = {
		social: [1080, 1350],
		story: [1080, 1920],
		og: [1200, 630]
	};

	const uid = $props.id();
	let tab = $state<Tab>('social');
	const tabs: [Tab, string][] = $derived([
		['social', text.exportSocial],
		['story', text.exportStory],
		['pdf', text.exportPdf],
		['link', text.exportLink]
	]);
	let manifest = $state<WebExportManifest | null>(null);
	/** The manifest request has settled (either way), so previews may load. */
	let settled = $state(false);
	/** URLs whose <img> failed to load. */
	let failed = $state<Record<string, boolean>>({});
	/** Prefetched export bytes by URL, so the share sheet keeps the user activation. */
	let blobs = $state<Record<string, Blob>>({});
	const pending = new Set<string>();
	/** The image whose bytes could not be fetched for the share sheet. */
	let shareFailed = $state<'social' | 'story' | ''>('');
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	let content = $state<HTMLElement | null>(null);

	const canShareLink = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
	const canShareFiles = (() => {
		if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
		try {
			const probe = new File([new Uint8Array(1)], 'probe.png', { type: 'image/png' });
			return navigator.canShare({ files: [probe] });
		} catch {
			return false;
		}
	})();

	/** The URL to use for a format: versioned, else unversioned, else '' when both failed. */
	function urlFor(id: ExportFormat): string {
		const versioned = formatURL(manifest, id, fallback);
		if (!failed[versioned]) return versioned;
		return failed[fallback[id]] ? '' : fallback[id];
	}

	function sizeOf(id: Image): [number, number] {
		const f = manifest?.formats.find((x) => x.id === id);
		return f?.width && f?.height ? [f.width, f.height] : SIZE[id];
	}

	const pages = $derived(manifest?.formats.find((f) => f.id === 'pdf')?.pages ?? 0);

	// Fetch the manifest on every open, so a regenerated edition shows its new
	// revision, a failed export is tried again, and a page reused for another
	// edition never shows the previous one's files.
	$effect(() => {
		if (!open) return;
		const controller = new AbortController();
		manifest = null;
		failed = {};
		shareFailed = '';
		settled = false;
		fetch(exportsURL, { signal: controller.signal, headers: { Accept: 'application/json' } })
			.then((r) => (r.ok ? (r.json() as Promise<WebExportManifest>) : null))
			.then((m) => {
				manifest = m && Array.isArray(m.formats) ? m : null;
				settled = true;
			})
			.catch(() => {
				if (controller.signal.aborted) return;
				manifest = null;
				settled = true;
			});
		return () => controller.abort();
	});

	// Prefetch the active image for the share sheet.
	$effect(() => {
		if (!open || !settled || !canShareFiles || (tab !== 'social' && tab !== 'story')) return;
		const id = tab;
		const url = urlFor(id) || fallback[id];
		if (blobs[url] || pending.has(url)) return;
		pending.add(url);
		fetchExport(url, fallback[id])
			.then((blob) => (blobs[url] = blob))
			.catch(() => {})
			.finally(() => pending.delete(url));
	});

	$effect(() => () => clearTimeout(copyTimer));

	async function shareImage(id: 'social' | 'story') {
		// Never '' once both previews failed: fetch('') would fetch this page.
		const url = urlFor(id) || fallback[id];
		shareFailed = '';
		let blob: Blob;
		try {
			blob = blobs[url] ?? (await fetchExport(url, fallback[id]));
		} catch {
			shareFailed = id;
			return;
		}
		const file = new File([blob], exportFileName(fallback[id]), { type: blob.type || 'image/png' });
		try {
			await navigator.share({ files: [file], title });
		} catch {
			return; // dismissed (AbortError), or the share target failed
		}
		trackExport(eventProps, id, 'share');
	}

	async function copyLink() {
		trackExport(eventProps, 'link', 'copy');
		try {
			await navigator.clipboard.writeText(copyURL);
		} catch {
			// Inside the dialog, so its focus trap does not pull the selection away.
			const area = document.createElement('textarea');
			area.value = copyURL;
			area.setAttribute('readonly', '');
			area.style.position = 'fixed';
			area.style.opacity = '0';
			(content ?? document.body).appendChild(area);
			area.select();
			document.execCommand('copy');
			area.remove();
		}
		copied = true;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = false), 1500);
	}

	async function shareLink() {
		trackExport(eventProps, 'link', 'share');
		try {
			await navigator.share({ title, url: nativeURL });
		} catch {
			/* dismissed */
		}
	}

	// WAI-ARIA tabs with automatic activation: arrows (wrapping), Home and End
	// move focus and select.
	function onTabKey(event: KeyboardEvent, i: number) {
		const n = tabs.length;
		const keys: Record<string, number> = {
			ArrowRight: (i + 1) % n,
			ArrowLeft: (i - 1 + n) % n,
			Home: 0,
			End: n - 1
		};
		const next = keys[event.key];
		if (next === undefined) return;
		event.preventDefault();
		tab = tabs[next][0];
		document.getElementById(`${uid}-tab-${tab}`)?.focus();
	}

	const panel = (id: Tab) => ({
		id: `${uid}-panel-${id}`,
		role: 'tabpanel',
		'aria-labelledby': `${uid}-tab-${id}`,
		hidden: tab !== id
	});

	const action = 'h-auto min-h-11 px-4';
</script>

{#snippet preview(id: Image, alt: string)}
	{@const url = urlFor(id)}
	{@const [width, height] = sizeOf(id)}
	<!-- Hidden once both URLs failed, so no empty frame sits above the note. -->
	<div class="studio-preview" style:--w={width} style:--h={height} hidden={settled && !url}>
		{#if settled}
			<img
				src={url || fallback[id]}
				{width}
				{height}
				{alt}
				decoding="async"
				hidden={!url}
				onerror={() => {
					if (url) failed[url] = true;
				}}
			/>
		{/if}
	</div>
	{#if settled && (!url || shareFailed === id)}
		<p class="studio-note" role="status">{text.exportUnavailable}</p>
	{/if}
{/snippet}

{#snippet imageTab(id: 'social' | 'story', alt: string)}
	{@render preview(id, alt)}
	<div class="studio-actions">
		<PrimaryButton
			href={fallback[id]}
			download={exportFileName(fallback[id])}
			class={action}
			onclick={() => trackExport(eventProps, id, 'download')}
		>
			{text.exportDownload}
		</PrimaryButton>
		{#if canShareFiles}
			<SecondaryButton class={action} onclick={() => shareImage(id)}>
				{text.exportShare}
			</SecondaryButton>
		{/if}
	</div>
{/snippet}

<dialog.Dialog bind:open>
	<dialog.Content
		hideCloseButton
		aria-labelledby="{uid}-title"
		class="studio max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-lg"
	>
		<div bind:this={content}>
			<div class="studio-head">
				<dialog.Title id="{uid}-title" class="studio-title">{text.exportTitle}</dialog.Title>
				<button
					type="button"
					class="studio-close"
					aria-label={text.exportClose}
					onclick={() => (open = false)}
				>
					<XIcon aria-hidden="true" />
				</button>
			</div>
			<div class="studio-body">
				<div
					role="tablist"
					class="grid w-full grid-cols-2 gap-1 rounded-lg bg-muted p-[3px] text-muted-foreground sm:grid-cols-4"
				>
					{#each tabs as [value, label], i (value)}
						<button
							type="button"
							role="tab"
							id="{uid}-tab-{value}"
							aria-controls="{uid}-panel-{value}"
							aria-selected={tab === value}
							tabindex={tab === value ? 0 : -1}
							class="studio-tab"
							onclick={() => (tab = value)}
							onkeydown={(event) => onTabKey(event, i)}
						>
							{label}
						</button>
					{/each}
				</div>
				<!-- Only the active panel's preview renders, so only it loads. -->
				<div {...panel('social')} class="studio-panel">
					{#if tab === 'social'}{@render imageTab('social', text.exportSocialAlt)}{/if}
				</div>
				<div {...panel('story')} class="studio-panel">
					{#if tab === 'story'}{@render imageTab('story', text.exportStoryAlt)}{/if}
				</div>
				<div {...panel('pdf')} class="studio-panel">
					<div class="studio-file">
						<Icon name="file-text" aria-hidden="true" class="size-6 shrink-0" />
						<div>
							<p class="studio-file__name">{text.exportPdf}</p>
							{#if pages > 0}
								<p class="studio-note">
									{pages === 1 ? text.exportOnePage : text.exportPages.replace('%d', String(pages))}
								</p>
							{/if}
						</div>
					</div>
					<div class="studio-actions">
						<PrimaryButton
							href={fallback.pdf}
							download={exportFileName(fallback.pdf)}
							class={action}
							onclick={() => trackExport(eventProps, 'pdf', 'download')}
						>
							{text.exportDownload}
						</PrimaryButton>
						<SecondaryButton
							href={fallback.pdf}
							target="_blank"
							rel="noopener"
							class={action}
							onclick={() => trackExport(eventProps, 'pdf', 'open')}
						>
							{text.exportOpenPdf}
						</SecondaryButton>
					</div>
				</div>
				<div {...panel('link')} class="studio-panel">
					{#if tab === 'link'}{@render preview('og', text.exportLinkAlt)}{/if}
					<div class="studio-actions">
						<PrimaryButton class={action} onclick={copyLink}>
							{copied ? text.exportCopied : text.exportCopyLink}
						</PrimaryButton>
						{#if canShareLink}
							<SecondaryButton class={action} onclick={shareLink}>
								{text.exportShare}
							</SecondaryButton>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</dialog.Content>
</dialog.Dialog>

<style>
	/* A native modal <dialog> (tui/dialog) in the top layer. It reads the global
	 * theme tokens that brief.css's --mi-* aliases point at, so it looks the same
	 * wherever it is mounted. */
	:global(.studio) {
		color: var(--foreground);
	}
	.studio-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0.5rem 0.5rem 1.25rem;
		border-bottom: 1px solid var(--border);
	}
	:global(.studio-title) {
		font-family: var(--font-display, 'Brygada 1918', Georgia, serif);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.3;
	}
	.studio-close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 0.75rem;
		color: var(--muted-foreground);
	}
	.studio-close:hover {
		color: var(--foreground);
	}
	.studio-close:focus-visible,
	.studio-tab:focus-visible {
		outline: 2px solid var(--color-focus, var(--ring));
		outline-offset: 2px;
	}
	.studio-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 1.25rem 1.25rem;
	}
	/* The segmented control the shadcn tabs drew: muted track, active tab raised. */
	.studio-tab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.75rem;
		padding: 0.125rem 0.5rem;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: color-mix(in oklab, var(--foreground) 60%, transparent);
		transition:
			color 150ms,
			background-color 150ms,
			box-shadow 150ms;
	}
	.studio-tab:hover,
	.studio-tab[aria-selected='true'] {
		color: var(--foreground);
	}
	.studio-tab[aria-selected='true'] {
		background: var(--background);
		box-shadow:
			0 1px 3px 0 rgb(0 0 0 / 0.1),
			0 1px 2px -1px rgb(0 0 0 / 0.1);
	}
	:global(.dark) .studio-tab {
		color: var(--muted-foreground);
	}
	:global(.dark) .studio-tab:hover,
	:global(.dark) .studio-tab[aria-selected='true'] {
		color: var(--foreground);
	}
	:global(.dark) .studio-tab[aria-selected='true'] {
		border-color: var(--input);
		background: color-mix(in oklab, var(--input) 30%, transparent);
	}
	.studio-panel {
		display: grid;
		gap: 1rem;
		padding-top: 0.5rem;
		font-size: 0.875rem;
	}
	.studio-panel[hidden] {
		display: none;
	}
	/* The format's ratio sets the frame: as wide as fits, at most min(52dvh, 26rem)
	 * tall. The hairline is an outline, so it does not change the frame's size. */
	.studio-preview {
		width: min(100%, calc(min(52dvh, 26rem) * var(--w) / var(--h)));
		aspect-ratio: var(--w) / var(--h);
		margin-inline: auto;
		outline: 1px solid var(--border);
		border-radius: 0.5rem;
		overflow: hidden;
	}
	.studio-preview[hidden] {
		display: none;
	}
	.studio-preview img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.studio-preview img[hidden] {
		display: none;
	}
	.studio-note {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}
	.studio-file {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 0;
		border-block: 1px solid var(--border);
		color: var(--muted-foreground);
	}
	.studio-file__name {
		color: var(--foreground);
		font-weight: 600;
	}
	.studio-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
