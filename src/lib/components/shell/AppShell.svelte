<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { ChevronRight, CircleUserRound, Ellipsis, LogOut, PanelLeft, Settings } from '@lucide/svelte';
	import NorviqLogo from '#lib/components/brand/NorviqLogo.svelte';
	import { t } from '#lib/i18n/context.svelte.js';
	import { activeTab as tabFor, bottomTabs, bottomTabsMore, isActivePath, isMoreTab, type NavItem } from '#lib/nav.js';
	import type { SocialConfig } from '#lib/nav.js';
	import SectionSubNav from './SectionSubNav.svelte';
	import NavBadge from './NavBadge.svelte';
	import { sidebarIcon, tabIcon } from './nav-icons.js';
	import { shell } from './shell-state.svelte.js';
	import { pageMotion } from '#lib/motion.js';

	// Port of shell.templ AppShell: mobile top bar, collapsible sidebar, main
	// column (trial banner + mobile section sub-nav + page), mobile bottom tabs.

	interface Props {
		username: string;
		email: string;
		sidebarItems: NavItem[];
		social: SocialConfig;
		trialExpired: boolean;
		children: Snippet;
	}

	let { username, email, sidebarItems, social, trialExpired, children }: Props = $props();

	const activePath = $derived(page.url.pathname);
	const activeTab = $derived(tabFor(activePath));
	const groupKeys = $derived(sidebarItems.map((g) => g.tab));
	let moreOpen = $state(false);

	const linkBase =
		'app-sidebar-link flex h-9 items-center gap-2.5 overflow-hidden rounded-md px-2.5 text-subhead transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sidebar-collapsed:justify-center sidebar-collapsed:px-0';
	const groupLabelClass =
		'app-sidebar-group-label flex h-9 w-full items-center gap-1 rounded-md px-2 text-footnote font-semibold text-sidebar-foreground/70 transition-[margin,opacity] duration-200 ease-linear hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sidebar-collapsed:pointer-events-none sidebar-collapsed:-mt-9 sidebar-collapsed:opacity-0';
	const settingsBase =
		'inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground sidebar-collapsed:hidden';

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') moreOpen = false;
		// Cmd/Ctrl+B toggles the rail, never while typing in a field.
		if (!(e.metaKey || e.ctrlKey) || e.altKey || e.key.toLowerCase() !== 'b') return;
		const el = document.activeElement as HTMLElement | null;
		if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
		e.preventDefault();
		shell.toggleSidebar();
	}

	$effect(() => {
		// Close the overflow menu after any navigation.
		void activePath;
		moreOpen = false;
	});
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
				<a
					href="/settings"
					class={activeTab === 'settings' ? 'app-icon-btn app-icon-btn-active lg:hidden' : 'app-icon-btn lg:hidden'}
					aria-label="Settings"
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
					<nav class="app-sidebar-nav min-h-0 flex-1 overflow-y-auto p-2" aria-label="Main navigation">
						{#each sidebarItems as group (group.tab)}
							{@const open = shell.isOpen(group.tab, activeTab)}
							<div
								class="app-sidebar-group pb-1"
								data-nav-group={group.tab}
								style:--nav-rows={open ? '1fr' : '0fr'}
								style:--nav-turn={open ? '0.25turn' : '0turn'}
							>
								<button
									type="button"
									class={groupLabelClass}
									aria-controls="nav-group-{group.tab}"
									aria-expanded={open}
									onclick={() => shell.toggleGroup(group.tab, groupKeys, activeTab)}
								>
									<span class="truncate">{group.label}</span>
									<ChevronRight class="app-sidebar-group-chevron ml-auto h-3.5 w-3.5 shrink-0" />
								</button>
								<div class="app-sidebar-group-panel" id="nav-group-{group.tab}">
									<ul class="app-sidebar-links flex flex-col gap-1">
										{#each group.children ?? [] as item (item.path)}
											{@const active = isActivePath(activePath, item.path)}
											{@const Icon = sidebarIcon(item.path)}
											<li>
												<a
													href={item.path}
													class={active
														? `${linkBase} app-sidebar-link-active bg-sidebar-accent font-semibold text-sidebar-accent-foreground`
														: `${linkBase} text-sidebar-foreground/80`}
													aria-current={active ? 'page' : undefined}
												>
													<span class="app-sidebar-link-icon shrink-0" aria-hidden="true"><Icon class="h-4 w-4" /></span>
													<span class="truncate sidebar-collapsed:hidden">{item.label}</span>
													{#if item.showProBadge}
														<span class="pro-badge pro-badge-sm sidebar-collapsed:hidden!">Pro</span>
													{/if}
													{#if item.badgeURL}
														<span class="ml-auto sidebar-collapsed:hidden"><NavBadge url={item.badgeURL} /></span>
													{/if}
												</a>
											</li>
										{/each}
									</ul>
								</div>
							</div>
						{/each}
					</nav>
					<div
						class="app-sidebar-account mt-auto flex shrink-0 items-center gap-2 border-t border-sidebar-border p-2 sidebar-collapsed:justify-center"
					>
						<span
							class="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground"
							aria-hidden="true"
						>
							<CircleUserRound class="h-4 w-4" />
						</span>
						<div class="min-w-0 flex-1 sidebar-collapsed:hidden">
							<p class="truncate text-subhead font-semibold text-sidebar-foreground">{username || 'Account'}</p>
							{#if email}<span class="block truncate text-caption text-sidebar-foreground/60">{email}</span>{/if}
						</div>
						<a
							href="/settings"
							class={activeTab === 'settings'
								? `app-sidebar-settings app-sidebar-settings-active ${settingsBase} bg-sidebar-accent text-sidebar-accent-foreground`
								: `app-sidebar-settings ${settingsBase} text-sidebar-foreground/70`}
							aria-label="Settings"
						>
							<Settings class="h-4 w-4" />
						</a>
					</div>
					<form method="post" action="/logout" class="app-sidebar-logout-form shrink-0 px-2 pb-2" data-sveltekit-reload>
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

			<main id="main-content" class="app-main" {@attach pageMotion()}>
				{#if trialExpired}
					<div class="trial-ended-banner trial-banner glass-card mx-4 mt-4 flex flex-wrap items-center gap-3 p-4" role="status">
						<span class="pro-badge">Trial ended</span>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-semibold">Your trial has ended</p>
							<p class="mt-0.5 text-sm text-muted-foreground">Subscribe to unlock all features.</p>
						</div>
						<a href="/settings/subscription" class="btn-primary w-full shrink-0 px-5 py-2 text-sm sm:w-auto">Subscribe</a>
					</div>
				{/if}
				{#each sidebarItems as group (group.tab)}
					{#if group.tab === activeTab && (group.children?.length ?? 0) > 1}
						<div class="mobile-section-subnav lg:hidden">
							<SectionSubNav items={group.children ?? []} />
						</div>
					{/if}
				{/each}
				{@render children()}
			</main>
		</div>

		<nav class="app-bottom-tabs" aria-label="Primary navigation">
			{#each bottomTabs(t) as tab (tab.tab)}
				{@const Icon = tabIcon(tab.tab)}
				<a href={tab.path} class={activeTab === tab.tab ? 'app-bottom-tab app-bottom-tab-active' : 'app-bottom-tab'}>
					<span class="app-bottom-tab-icon" aria-hidden="true"><Icon class="h-6 w-6" /></span>
					<span>{tab.label}</span>
				</a>
			{/each}
			<button
				type="button"
				class={isMoreTab(activeTab) ? 'app-bottom-tab app-bottom-tab-active' : 'app-bottom-tab'}
				onclick={() => (moreOpen = !moreOpen)}
				aria-expanded={moreOpen}
				aria-haspopup="menu"
				aria-controls="bottom-tabs-more"
			>
				<span class="app-bottom-tab-icon" aria-hidden="true"><Ellipsis class="h-6 w-6" /></span>
				<span>{t('More')}</span>
			</button>
			{#if moreOpen}
				<div id="bottom-tabs-more" class="app-bottom-tabs-more" role="menu">
					{#each bottomTabsMore(t, social) as tab (tab.tab)}
						{@const Icon = tabIcon(tab.tab)}
						<a
							href={tab.path}
							class={activeTab === tab.tab ? 'app-bottom-more-link app-bottom-more-link-active' : 'app-bottom-more-link'}
							role="menuitem"
						>
							<span class="app-bottom-tab-icon" aria-hidden="true"><Icon class="h-6 w-6" /></span>
							<span>{tab.label}</span>
						</a>
					{/each}
				</div>
			{/if}
		</nav>
	</div>
</div>
