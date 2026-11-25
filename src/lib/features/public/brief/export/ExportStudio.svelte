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
	// ExportTrigger, so bits-ui stays out of the brief route's static graph.
	// Previews and the share sheet use the manifest's versioned URLs, and fall
	// back to the unversioned one when that fails (superseded revision, or no
	// manifest). Downloads and Open always use the unversioned URL: a link the
	// browser follows on its own has no fallback, and the backend 404s a
	// superseded revision.
	import XIcon from '@lucide/svelte/icons/x';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import PrimaryButton from '#lib/components/norviq/PrimaryButton.svelte';
	import SecondaryButton from '#lib/components/norviq/SecondaryButton.svelte';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
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

	let tab = $state<Tab>('social');
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

	const action = 'h-auto min-h-11 px-4';
</script>

{#snippet preview(id: Image, alt: string)}
	{@const url = urlFor(id)}
	{@const [width, height] = sizeOf(id)}
	<div class="studio-preview" style:aspect-ratio="{width} / {height}">
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

<Dialog.Root bind:open>
	<Dialog.Content
		bind:ref={content}
		showCloseButton={false}
		class="studio max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-lg"
	>
		<div class="studio-head">
			<Dialog.Title class="studio-title">{text.exportTitle}</Dialog.Title>
			<Dialog.Close class="studio-close" aria-label={text.exportClose}>
				<XIcon aria-hidden="true" />
			</Dialog.Close>
		</div>
		<Tabs.Root bind:value={tab} class="studio-body">
			<Tabs.List
				class="grid w-full grid-cols-2 gap-1 group-data-horizontal/tabs:h-auto sm:grid-cols-4"
			>
				{#each [['social', text.exportSocial], ['story', text.exportStory], ['pdf', text.exportPdf], ['link', text.exportLink]] as [value, label] (value)}
					<Tabs.Trigger {value} class="h-auto min-h-11 px-2 whitespace-normal">
						{label}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>
			<!-- Only the active panel renders, so only its preview loads. -->
			<Tabs.Content value="social" class="studio-panel">
				{#if tab === 'social'}{@render imageTab('social', text.exportSocialAlt)}{/if}
			</Tabs.Content>
			<Tabs.Content value="story" class="studio-panel">
				{#if tab === 'story'}{@render imageTab('story', text.exportStoryAlt)}{/if}
			</Tabs.Content>
			<Tabs.Content value="pdf" class="studio-panel">
				<div class="studio-file">
					<FileTextIcon aria-hidden="true" class="size-6 shrink-0" />
					<div>
						<p class="studio-file__name">{text.exportPdf}</p>
						{#if pages > 0}
							<p class="studio-note">{text.exportPages.replace('%d', String(pages))}</p>
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
			</Tabs.Content>
			<Tabs.Content value="link" class="studio-panel">
				{#if tab === 'link'}{@render preview('og', text.exportLinkAlt)}{/if}
				<div class="studio-actions">
					<PrimaryButton class={action} onclick={copyLink}>
						{copied ? text.exportCopied : text.exportCopyLink}
					</PrimaryButton>
					{#if canShareLink}
						<SecondaryButton class={action} onclick={shareLink}>{text.exportShare}</SecondaryButton>
					{/if}
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>

<style>
	/* The dialog is portalled to <body>, outside .mi, so it reads the global
	 * theme tokens that brief.css's --mi-* aliases point at. */
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
	:global(.studio-close) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 0.75rem;
		color: var(--muted-foreground);
	}
	:global(.studio-close:hover) {
		color: var(--foreground);
	}
	:global(.studio-close:focus-visible) {
		outline: 2px solid var(--color-focus, var(--ring));
		outline-offset: 2px;
	}
	:global(.studio-body) {
		padding: 1rem 1.25rem 1.25rem;
	}
	:global(.studio-panel) {
		display: grid;
		gap: 1rem;
		padding-top: 0.5rem;
	}
	.studio-preview {
		display: flex;
		justify-content: center;
		height: min(52dvh, 26rem);
		max-width: 100%;
		margin-inline: auto;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		overflow: hidden;
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
