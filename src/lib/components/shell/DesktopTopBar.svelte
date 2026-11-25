<script lang="ts">
	// The desktop top bar (DS 2.0 spec §4.2, §6.6): "{Domain} · {weekday day
	// month}" on the left; search (⌘K), notifications and Ask Q on the right.
	// AppShell shows it at 1024px and up, above the main column. The page keeps
	// its own header: the bar names the domain, not the page.
	import { onMount } from 'svelte';
	import { Search } from '@lucide/svelte';
	import { locale, t } from '#lib/i18n/context.svelte.js';
	import { requestQuickQ } from '#lib/features/dashboard/assistant/quick-open.svelte.js';
	import { sidebarIcon } from './nav-icons.js';
	import { openPalette } from './palette-state.svelte.js';
	import { topBarDate } from './top-bar-date.js';

	interface Props {
		domainLabel: string | null;
		/** 'card' when QuickAssistant is mounted on this page, else a link to full Q. */
		qMode: 'card' | 'link';
	}

	let { domainLabel, qMode }: Props = $props();

	// Worker time is UTC, so the server prints the domain alone and the browser
	// adds the date in its own zone.
	let date = $state<string | null>(null);
	onMount(() => {
		date = topBarDate(new Date(), locale());
	});

	const BellIcon = sidebarIcon('/notifications');
	const QIcon = sidebarIcon('/assistant');
	const action =
		'inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-subhead text-foreground transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';
</script>

<header
	class="app-desktop-topbar hidden shrink-0 items-center gap-4 border-b border-border bg-background px-5 lg:flex"
>
	<p class="min-w-0 flex-1 truncate text-subhead text-muted-foreground">
		{#if domainLabel}
			<span class="app-desktop-topbar-domain font-semibold text-foreground">{domainLabel}</span>
		{/if}
		<!-- An expression: Svelte trims literal spaces at a block's edges. -->
		{#if domainLabel && date}{' · '}{/if}
		{#if date}<span>{date}</span>{/if}
	</p>
	<div class="flex shrink-0 items-center gap-2">
		<button
			type="button"
			class="inline-flex h-9 w-72 items-center gap-2 rounded-md border border-border px-3 text-subhead text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
			onclick={openPalette}
		>
			<Search class="h-4 w-4 shrink-0" aria-hidden="true" />
			<span class="truncate">{t('Search holdings, pages, actions')}</span>
			<kbd class="ml-auto font-sans text-caption">⌘K</kbd>
		</button>
		<a
			href="/notifications"
			class="{action} w-9 justify-center px-0"
			aria-label={t('Notifications')}
		>
			<BellIcon class="h-4 w-4" aria-hidden="true" />
		</a>
		{#if qMode === 'card'}
			<button type="button" class={action} onclick={requestQuickQ}>
				<QIcon class="h-4 w-4" aria-hidden="true" />
				<span>{t('Ask Q')}</span>
			</button>
		{:else}
			<a href="/assistant" class={action}>
				<QIcon class="h-4 w-4" aria-hidden="true" />
				<span>{t('Ask Q')}</span>
			</a>
		{/if}
	</div>
</header>

<style>
	/* The token is the bar's height: the desktop toast and Q card offset by it. */
	.app-desktop-topbar {
		height: var(--app-desktop-topbar-height);
	}
</style>
