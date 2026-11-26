<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import {
		ChevronRight,
		CircleUserRound,
		Ellipsis,
		LogOut,
		PanelLeft,
		Search,
		Settings
	} from '@lucide/svelte';
	import NorviqLogo from '#lib/components/brand/NorviqLogo.svelte';
	import { Feature } from '#lib/billing.js';
	import { quickQAllowedOn } from '#lib/features/dashboard/assistant/quick.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import { achievementsOn, type SocialConfig } from '#lib/nav.js';
	import { navContextFrom } from '#lib/nav/context.js';
	import { DOMAIN_META } from '#lib/nav/destinations.js';
	import {
		activeDestination,
		activeDomain,
		bottomBar,
		subNavLinks,
		visibleDestinations,
		type SidebarDomainVM
	} from '#lib/nav/visible.js';
	import DesktopTopBar from './DesktopTopBar.svelte';
	import SectionSubNav from './SectionSubNav.svelte';
	import NavBadge from './NavBadge.svelte';
	import { domainIcon, sidebarIcon } from './nav-icons.js';
	import { shell } from './shell-state.svelte.js';
	import { loadPalette, openPalette, palette } from './palette-state.svelte.js';
	import { pageMotion } from '#lib/motion.js';
	import UnlockToast from '#lib/features/achievements/UnlockToast.svelte';

	// Port of shell.templ AppShell, regrouped into the six DS 2.0 P3 domains:
	// mobile top bar, collapsible sidebar (domains, then search, Settings and the
	// account in the foot), main column (desktop top bar, then trial banner +
	// mobile section sub-nav + page), mobile bottom bar (Today, Money, Wealth,
	// Plan, More).

	interface Props {
		username: string;
		email: string;
		sidebar: SidebarDomainVM[];
		social: SocialConfig;
		trialExpired: boolean;
		children: Snippet;
	}

	let { username, email, sidebar, social, trialExpired, children }: Props = $props();

	// Go renderShell's activePath: a page may render under another section's nav
	// (pilots under /markets) by returning `activePath` from its load.
	const activePath = $derived(
		typeof page.data.activePath === 'string' && page.data.activePath
			? page.data.activePath
			: page.url.pathname
	);
	// The same gates and Pro badges as the server-built sidebar.
	const navCtx = $derived(navContextFrom(page.data));
	const destinations = $derived(visibleDestinations(navCtx));
	const current = $derived(activeDestination(activePath, destinations));
	const domain = $derived(activeDomain(activePath, destinations));
	const groupKeys = $derived(sidebar.map((g) => g.key));
	const subLinks = $derived(subNavLinks(t, navCtx, activePath));
	// Settings and its sub-pages; Achievements is an account page but not Settings.
	const settingsActive = $derived(
		current?.id === 'settings' || current?.id === 'brokers-and-imports'
	);
	const currentPath = $derived(activePath.replace(/\/+$/, '') || '/');
	// More holds the domains off the bar (Intelligence, Community) and Account.
	const moreActive = $derived(
		currentPath === '/more' ||
			domain === 'intelligence' ||
			domain === 'community' ||
			domain === 'account'
	);
	// The desktop top bar names the domain: Account pages go by the /more
	// section's name, /more by its own, and anything outside the six by none.
	const domainLabel = $derived(
		currentPath === '/more'
			? t('More')
			: domain === 'account'
				? t('Account')
				: domain
					? t(DOMAIN_META[domain].label)
					: null
	);
	// Ask Q opens the Quick Q card wherever (app)/+layout.svelte mounts it.
	const qMode = $derived<'card' | 'link'>(
		page.data.features?.[Feature.AIInsights] &&
			!page.data.guidedStep &&
			quickQAllowedOn(page.url.pathname)
			? 'card'
			: 'link'
	);

	const linkBase =
		'app-sidebar-link flex h-9 items-center gap-2.5 overflow-hidden rounded-md px-2.5 text-subhead transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sidebar-collapsed:justify-center sidebar-collapsed:px-0';
	const linkActive = `${linkBase} app-sidebar-link-active bg-sidebar-accent font-semibold text-sidebar-accent-foreground`;
	const linkIdle = `${linkBase} text-sidebar-foreground/80`;
	const groupLabelClass =
		'app-sidebar-group-label flex h-9 w-full items-center gap-1 rounded-md px-2 text-footnote font-semibold text-sidebar-foreground/70 transition-[margin,opacity] duration-200 ease-linear hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sidebar-collapsed:pointer-events-none sidebar-collapsed:-mt-9 sidebar-collapsed:opacity-0';

	function onKeydown(e: KeyboardEvent) {
		if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
		const key = e.key.toLowerCase();
		// Cmd/Ctrl+K opens the palette from anywhere, a text field included.
		if (key === 'k') {
			e.preventDefault();
			openPalette();
			return;
		}
		// Cmd/Ctrl+B toggles the rail, never while typing in a field.
		if (key !== 'b') return;
		const el = document.activeElement as HTMLElement | null;
		if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
		e.preventDefault();
		shell.toggleSidebar();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="app-shell">
	<div class="app-frame vigil-app-shell">
		<header class="app-topbar vigil-topbar lg:hidden">
			<div class="app-topbar-brand flex min-w-0 items-center gap-2 sm:gap-3">
				<a href="/dashboard" class="flex shrink-0 items-center gap-2" aria-label="Norviq home">
					<NorviqLogo />
				</a>
			</div>
			<div class="app-topbar-actions flex shrink-0 items-center gap-2 sm:gap-3">
				{#if username}
					<div class="hidden text-right text-sm md:block">
						<p class="font-semibold">{username}</p>
						{#if email}<p class="text-muted-foreground">{email}</p>{/if}
					</div>
				{/if}
				<button
					type="button"
					class="app-icon-btn lg:hidden"
					aria-label={t('Search and commands')}
					onclick={openPalette}
				>
					<Search class="h-5 w-5" />
				</button>
				<a
					href="/settings"
					class={settingsActive
						? 'app-icon-btn app-icon-btn-active lg:hidden'
						: 'app-icon-btn lg:hidden'}
					aria-label={t('Settings')}
				>
					<Settings class="h-5 w-5" />
				</a>
				<form method="post" action="/logout" data-sveltekit-reload>
					<button type="submit" class="app-logout-btn" aria-label="Log out">
						<span class="sm:hidden">Out</span>
						<span class="hidden sm:inline">{t('Log out')}</span>
					</button>
				</form>
			</div>
		</header>

		<div class="app-body">
			<aside
				class="app-sidebar vigil-sidebar hidden min-h-0 w-64 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-linear lg:flex sidebar-collapsed:w-12"
			>
				<div class="app-sidebar-shell flex min-h-0 w-full flex-1 flex-col">
					<div
						class="app-sidebar-top flex h-14 shrink-0 items-center gap-2 px-3 sidebar-collapsed:justify-center sidebar-collapsed:px-0"
					>
						<a
							href="/dashboard"
							class="flex min-w-0 shrink items-center gap-2 sidebar-collapsed:hidden [&_.norviq-logo]:mx-0 [&_.norviq-logo]:size-7"
							aria-label="Norviq home"
						>
							<NorviqLogo />
						</a>
						<button
							type="button"
							onclick={() => shell.toggleSidebar()}
							class="ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sidebar-collapsed:ml-0"
							aria-label="Toggle sidebar"
							aria-keyshortcuts="Meta+B Control+B"
						>
							<PanelLeft class="h-4 w-4" />
						</button>
					</div>
					<nav
						class="app-sidebar-nav min-h-0 flex-1 overflow-y-auto p-2"
						aria-label="Main navigation"
					>
						{#each sidebar as group (group.key)}
							{@const open = shell.isOpen(group.key, domain)}
							<div
								class="app-sidebar-group pb-1"
								data-nav-group={group.key}
								style:--nav-rows={open ? '1fr' : '0fr'}
								style:--nav-turn={open ? '0.25turn' : '0turn'}
							>
								<button
									type="button"
									class={groupLabelClass}
									aria-controls="nav-group-{group.key}"
									aria-expanded={open}
									onclick={() => shell.toggleGroup(group.key, groupKeys, domain)}
								>
									<span class="truncate">{group.label}</span>
									<ChevronRight class="app-sidebar-group-chevron ml-auto h-3.5 w-3.5 shrink-0" />
								</button>
								<div class="app-sidebar-group-panel" id="nav-group-{group.key}">
									<ul class="app-sidebar-links flex flex-col gap-1">
										{#each group.picks as item (item.path)}
											{@const active = current?.path === item.path}
											{@const Icon = sidebarIcon(item.path)}
											<li>
												<a
													href={item.path}
													class={active ? linkActive : linkIdle}
													aria-current={active ? 'page' : undefined}
												>
													<span class="app-sidebar-link-icon shrink-0" aria-hidden="true"
														><Icon class="h-4 w-4" /></span
													>
													<span class="truncate sidebar-collapsed:hidden">{item.label}</span>
													{#if item.showProBadge}
														<span class="pro-badge pro-badge-sm sidebar-collapsed:hidden!">Pro</span
														>
													{/if}
													{#if item.badgeURL}
														<span class="ml-auto sidebar-collapsed:hidden"
															><NavBadge url={item.badgeURL} /></span
														>
													{/if}
												</a>
											</li>
										{/each}
										<!-- The rail keeps the picks' icons only; the index link has none. -->
										<li class="sidebar-collapsed:hidden">
											<a
												href={group.indexPath}
												class={currentPath === group.indexPath
													? `${linkBase} app-sidebar-link-active text-footnote font-semibold`
													: `${linkBase} text-footnote text-sidebar-foreground/70`}
												aria-current={currentPath === group.indexPath ? 'page' : undefined}
												>{t('All in %s →', group.label)}</a
											>
										</li>
									</ul>
								</div>
							</div>
						{/each}
					</nav>
					<div
						class="app-sidebar-foot flex shrink-0 flex-col gap-1 border-t border-sidebar-border p-2"
					>
						<!-- aria-label: the collapsed rail hides the text, leaving only the icon. -->
						<button
							type="button"
							class="{linkIdle} w-full"
							aria-label={t('Search and commands')}
							onclick={openPalette}
						>
							<span class="app-sidebar-link-icon shrink-0" aria-hidden="true"
								><Search class="h-4 w-4" /></span
							>
							<span class="truncate sidebar-collapsed:hidden">{t('Search and commands')}</span>
							<kbd
								class="ml-auto font-sans text-caption text-muted-foreground sidebar-collapsed:hidden"
								>⌘K</kbd
							>
						</button>
						<a
							href="/settings"
							class={settingsActive ? linkActive : linkIdle}
							aria-current={settingsActive ? 'page' : undefined}
							aria-label={t('Settings')}
						>
							<span class="app-sidebar-link-icon shrink-0" aria-hidden="true"
								><Settings class="h-4 w-4" /></span
							>
							<span class="truncate sidebar-collapsed:hidden">{t('Settings')}</span>
						</a>
						<div
							class="app-sidebar-account flex items-center gap-2 pt-1 sidebar-collapsed:justify-center"
						>
							<span
								class="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground"
								aria-hidden="true"
							>
								<CircleUserRound class="h-4 w-4" />
							</span>
							<div class="min-w-0 flex-1 sidebar-collapsed:hidden">
								<p class="truncate text-subhead font-semibold text-sidebar-foreground">
									{username || t('Account')}
								</p>
								{#if email}<span class="block truncate text-caption text-muted-foreground"
										>{email}</span
									>{/if}
							</div>
						</div>
					</div>
					<form
						method="post"
						action="/logout"
						class="app-sidebar-logout-form shrink-0 px-2 pb-2"
						data-sveltekit-reload
					>
						<button
							type="submit"
							class="app-sidebar-logout flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-subhead text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground sidebar-collapsed:justify-center sidebar-collapsed:px-0"
						>
							<LogOut class="h-4 w-4" />
							<span class="sidebar-collapsed:hidden">{t('Log out')}</span>
						</button>
					</form>
				</div>
			</aside>

			<!-- The top bar stays outside <main>: main scrolls and animates. -->
			<div class="app-column">
				<DesktopTopBar {domainLabel} {qMode} />
				<main id="main-content" class="app-main" {@attach pageMotion()}>
					{#if trialExpired}
						<div
							class="trial-ended-banner trial-banner glass-card mb-6 flex flex-wrap items-center gap-3 p-4"
							role="status"
						>
							<span class="pro-badge">{t('Trial ended')}</span>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-semibold">{t('Your trial has ended')}</p>
								<p class="mt-0.5 text-sm text-muted-foreground">
									{t('Subscribe to unlock all features.')}
								</p>
							</div>
							<a
								href="/settings/subscription"
								class="btn-primary w-full shrink-0 px-5 py-2 text-sm sm:w-auto">{t('Subscribe')}</a
							>
						</div>
					{/if}
					{#if subLinks.length > 0}
						<div class="mobile-section-subnav lg:hidden">
							<SectionSubNav links={subLinks} {activePath} />
						</div>
					{/if}
					{@render children()}
					{#if achievementsOn(social)}
						<UnlockToast />
					{/if}
				</main>
			</div>
		</div>

		<!-- Loaded on the first opening, so the shell chunk does not carry it; a
		     failed load resets everOpened, and the next opening loads it again. -->
		{#if palette.everOpened}
			{#await loadPalette() then CommandPalette}
				{#if CommandPalette}<CommandPalette />{/if}
			{/await}
		{/if}

		<nav class="app-bottom-tabs" aria-label="Primary navigation">
			{#each bottomBar(t) as tab (tab.key)}
				{@const active = tab.key === 'more' ? moreActive : domain === tab.key}
				{@const Icon = tab.key === 'more' ? Ellipsis : domainIcon(tab.key)}
				<a
					href={tab.path}
					class={active ? 'app-bottom-tab app-bottom-tab-active' : 'app-bottom-tab'}
					aria-current={active ? 'page' : undefined}
				>
					<span class="app-bottom-tab-icon" aria-hidden="true"><Icon class="h-6 w-6" /></span>
					<span>{tab.label}</span>
				</a>
			{/each}
		</nav>
	</div>
</div>
