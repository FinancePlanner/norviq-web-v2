<script lang="ts" module>
	/** components.ShareBarText — every visible label, already in the page's language. */
	export interface ShareBarText {
		group: string;
		x: string;
		linkedIn: string;
		reddit?: string;
		whatsApp?: string;
		discord: string;
		instagram: string;
		copy: string;
		copied: string;
		native?: string;
	}
</script>

<script lang="ts">
	// components.ShareBar + assets/share.js behaviour: copy buttons, the
	// Instagram card (OS share sheet with the PNG, else download + copy caption),
	// the native share button (only shown where navigator.share exists) and
	// analytics capture of {…eventProps, channel} when `event` is set.
	import { onMount } from 'svelte';
	import NativeButton from './NativeButton.svelte';
	import { captureShare, type ShareLinks } from './share-links.js';

	type Props = {
		id?: string;
		class?: string;
		links: ShareLinks;
		cardImageURL: string;
		cardFileName?: string;
		native?: boolean;
		nativeURL?: string;
		nativeTitle?: string;
		event?: string;
		/** JSON object string, as in Go (data-share-props). */
		eventProps?: string;
		text: ShareBarText;
	};

	let {
		id,
		class: className,
		links,
		cardImageURL,
		cardFileName = '',
		native = false,
		nativeURL = '',
		nativeTitle = '',
		event = '',
		eventProps = '',
		text
	}: Props = $props();

	const cls = 'rounded-lg border border-border px-3 py-1.5';
	let canShare = $state(false);
	let flashed = $state<Record<string, boolean>>({});
	const timers: Record<string, ReturnType<typeof setTimeout>> = {};

	onMount(() => {
		canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
		return () => Object.values(timers).forEach(clearTimeout);
	});

	function track(channel: string) {
		if (!event) return;
		let props: Record<string, unknown> = {};
		try {
			props = (JSON.parse(eventProps || '{}') as Record<string, unknown>) || {};
		} catch {
			/* malformed props: capture the channel alone */
		}
		captureShare(event, { ...props, channel });
	}

	function flash(key: string) {
		flashed[key] = true;
		clearTimeout(timers[key]);
		timers[key] = setTimeout(() => (flashed[key] = false), 1500);
	}

	async function copyText(value: string, key: string) {
		try {
			await navigator.clipboard.writeText(value);
		} catch {
			const area = document.createElement('textarea');
			area.value = value;
			area.setAttribute('readonly', '');
			area.style.position = 'fixed';
			area.style.opacity = '0';
			document.body.appendChild(area);
			area.select();
			document.execCommand('copy');
			area.remove();
		}
		flash(key);
	}

	async function shareCard() {
		let blob: Blob;
		try {
			const response = await fetch(cardImageURL);
			if (!response.ok) return;
			blob = await response.blob();
		} catch {
			return;
		}
		const name = cardFileName || 'norviq-article.png';
		const file = new File([blob], name, { type: 'image/png' });
		if (navigator.canShare && navigator.canShare({ files: [file] })) {
			try {
				await navigator.share({ files: [file], text: links.instagramCaption });
				return;
			} catch (error) {
				if (error instanceof Error && error.name === 'AbortError') return;
			}
		}
		const objectURL = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = objectURL;
		link.download = name;
		document.body.appendChild(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
		await copyText(links.instagramCaption, 'instagram');
	}

	async function shareNative() {
		if (!canShare) return;
		track('native');
		try {
			await navigator.share({ title: nativeTitle, url: nativeURL });
		} catch {
			/* dismissed */
		}
	}
</script>

{#snippet shareLink(href: string, channel: string, label: string)}
	<a
		{href}
		target="_blank"
		rel="noopener noreferrer"
		class={cls}
		data-share-channel={channel}
		onclick={() => track(channel)}>{label}</a
	>
{/snippet}

<div
	{id}
	class={['flex flex-wrap gap-2 text-sm', className]}
	role="group"
	aria-label={text.group}
	data-share-event={event || undefined}
	data-share-props={event ? eventProps : undefined}
>
	{#if native}
		<NativeButton
			class={cls}
			hidden={!canShare}
			data-share-native
			data-share-channel="native"
			data-share-url={nativeURL}
			data-share-title={nativeTitle}
			onclick={shareNative}
		>
			{text.native}
		</NativeButton>
	{/if}
	{@render shareLink(links.x, 'x', text.x)}
	{@render shareLink(links.linkedIn, 'linkedin', text.linkedIn)}
	{#if links.reddit && text.reddit}
		{@render shareLink(links.reddit, 'reddit', text.reddit)}
	{/if}
	{#if links.whatsApp && text.whatsApp}
		{@render shareLink(links.whatsApp, 'whatsapp', text.whatsApp)}
	{/if}
	<NativeButton
		class={cls}
		data-share-copy={links.discordText}
		data-share-channel="discord"
		data-copied-label={text.copied}
		onclick={() => {
			track('discord');
			void copyText(links.discordText, 'discord');
		}}
	>
		{flashed.discord ? text.copied || 'Copied' : text.discord}
	</NativeButton>
	<NativeButton
		class={cls}
		data-share-card
		data-share-channel="instagram"
		data-card-url={cardImageURL}
		data-card-filename={cardFileName}
		data-caption={links.instagramCaption}
		data-copied-label={text.copied}
		onclick={() => {
			track('instagram');
			void shareCard();
		}}
	>
		{flashed.instagram ? text.copied || 'Copied' : text.instagram}
	</NativeButton>
	<NativeButton
		class={cls}
		data-share-copy={links.copy}
		data-share-channel="copy"
		data-copied-label={text.copied}
		onclick={() => {
			track('copy');
			void copyText(links.copy, 'copy');
		}}
	>
		{flashed.copy ? text.copied || 'Copied' : text.copy}
	</NativeButton>
</div>
