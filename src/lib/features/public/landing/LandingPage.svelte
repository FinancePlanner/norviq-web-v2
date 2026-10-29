<script lang="ts">
	// landing.MetaTags + landing.Page (internal/pages/landing/landing.templ),
	// with the landing bundle's behaviour (assets/landing.js): scroll reveals
	// (motion-reveal.js → #lib/motion.js initScrollTaste), the CTA click
	// funnel event, and the market brief card (market-brief.js →
	// MarketBriefShell). The theme toggle, analytics and error reporting come
	// from the kit and the root layout.
	import { onMount } from 'svelte';
	import BrandLogo from '#lib/components/norviq/BrandLogo.svelte';
	import PrimaryButton from '#lib/components/norviq/PrimaryButton.svelte';
	import StoreBadges from '#lib/components/norviq/StoreBadges.svelte';
	import ThemeToggleCompact from '#lib/components/norviq/ThemeToggleCompact.svelte';
	import VigIcon from '#lib/components/norviq/VigIcon.svelte';
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import MarketBriefShell from '#lib/features/dashboard/market-brief/MarketBriefShell.svelte';
	import { capture } from '#lib/analytics/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import { initScrollTaste } from '#lib/motion.js';
	import HeroWallCard from './HeroWallCard.svelte';
	import { DiscordURL, OGImagePath, absoluteURL, heroBackSlots, heroFrontSlots, type LandingVM } from './landing.js';
	import './landing.css';

	let { vm }: { vm: LandingVM } = $props();

	const canonical = $derived(absoluteURL(vm, '/'));
	const ogImage = $derived(absoluteURL(vm, OGImagePath));
	// PARITY ODDITY: Go's landing.templ puts `@templ.Raw(StructuredData(vm))`
	// inside a <script> element, where templ treats it as raw text, so
	// production serves that literal string as the JSON-LD (checked against
	// the Go web, 2026-10-29). Ported byte-for-byte per the migration rules.
	// The intended graph is structuredData(vm) in landing.ts; swap it in once the fix is
	// agreed on both sides.
	const jsonLD = '\n\t\t@templ.Raw(StructuredData(vm))\n\t';
	const backSlots = heroBackSlots();
	const frontSlots = heroFrontSlots();

	let main: HTMLElement;

	onMount(() => {
		const stopReveals = initScrollTaste(main);
		// landing.js trackSignupClicks: CTA clicks are the one funnel event the
		// landing page owns.
		const onClick = (event: MouseEvent) => {
			const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="/signup"], a.store-badge');
			if (!link) return;
			const section = link.closest<HTMLElement>('[data-landing-section]')?.dataset.landingSection;
			const location = section || (link.closest('.landing-nav') ? 'nav' : 'hero');
			const target = link.classList.contains('store-badge') ? 'store' : 'signup';
			capture('cta_clicked', { location, target, href: link.getAttribute('href') });
		};
		// landing.js trackDiscordClicks: the footer's Discord invite.
		const onDiscord = (event: MouseEvent) => {
			if ((event.target as Element | null)?.closest?.('a[data-discord-link]')) capture('discord_link_clicked', { surface: 'footer' });
		};
		document.addEventListener('click', onDiscord);
		document.addEventListener('click', onClick);
		return () => {
			stopReveals();
			document.removeEventListener('click', onClick);
			document.removeEventListener('click', onDiscord);
		};
	});

	type Feature = [title: string, description: string];
</script>

<svelte:head>
	<title>Norviq — nothing slips past.</title>
	<meta
		name="description"
		content="Norviq - nothing slips past. Portfolio, spending, and AI-powered signals in one private financial guardian, with MCP integrations."
	/>
	<meta name="keywords" content="Norviq, portfolio tracker, stock research, due diligence, expenses, budgeting, AI finance, MCP" />
	<meta name="robots" content="index,follow,max-image-preview:large" />
	{#if vm.appStoreID}
		<meta name="apple-itunes-app" content={'app-id=' + vm.appStoreID} />
		<meta name="al:ios:app_store_id" content={vm.appStoreID} />
		<meta name="al:ios:app_name" content="Norviq" />
	{/if}
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Norviq" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content="Norviq — nothing slips past." />
	<meta property="og:description" content="Norviq keeps the vigil: wealth, spending, and the signals between." />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Norviq — nothing slips past." />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@NorviqPlanner" />
	<meta name="twitter:title" content="Norviq — nothing slips past." />
	<meta name="twitter:description" content="Norviq keeps the vigil: wealth, spending, and the signals between." />
	<meta name="twitter:image" content={ogImage} />
	<meta name="twitter:image:alt" content="Norviq — nothing slips past." />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- Go-style escaped JSON (<, >, & as \u00XX) -->
	{@html '<script type="application/ld+json">' + jsonLD + '</scr' + 'ipt>'}
</svelte:head>

{#snippet specRow(title: string, description: string)}
	<div class="landing-spec-row">
		<p class="landing-spec-name">{title}</p>
		<p class="landing-spec-desc">{description}</p>
	</div>
{/snippet}

{#snippet screenshotFrame(title: string, imageURL: string)}
	<div class="screenshot-card landing-screenshot-item" data-motion-reveal>
		<div class="screenshot-frame">
			<img src={imageURL} alt={title} class="screenshot-image" loading="lazy" />
		</div>
		<h3 class="mt-4 font-semibold">{title}</h3>
	</div>
{/snippet}

{#snippet vigilStation(kicker: string, title: string, lead: string, features: Feature[], imageURL: string, imageTitle: string, mark: boolean)}
	<article class="landing-vigil-station" data-motion-reveal>
		{#if mark}
			<VigIcon class="landing-station-vig" />
		{/if}
		<p class="landing-eyebrow">{kicker}</p>
		<h2 class="landing-section-title landing-vigil-title">{title}</h2>
		<p class="landing-section-lead">{lead}</p>
		<div class="landing-vigil-grid">
			<div class="landing-spec-list landing-vigil-features">
				{#each features as [ft, fd] (ft)}
					{@render specRow(ft, fd)}
				{/each}
			</div>
			<div class="landing-vigil-shot">
				{@render screenshotFrame(imageTitle, imageURL)}
			</div>
		</div>
	</article>
{/snippet}

{#snippet planCard(title: string, description: string, items: string[], highlighted: boolean)}
	<div class={'landing-plan-card rounded-lg p-6 md:p-8' + (highlighted ? ' landing-plan-card-featured border-[var(--color-tint)]' : '')}>
		<div class="flex items-start justify-between gap-4">
			<div>
				<h3 class="text-2xl font-bold">{title}</h3>
				<p class="mt-2 text-sm text-muted-foreground">{description}</p>
			</div>
			{#if highlighted}
				<span class="pro-badge">Recommended</span>
			{/if}
		</div>
		<ul class="mt-6 space-y-3 text-sm">
			{#each items as item (item)}
				<li class="flex gap-3">
					<span class="mt-0.5 text-[var(--color-success)]" aria-hidden="true">
						<Icon name="check" class="h-4 w-4" />
					</span>
					<span>{item}</span>
				</li>
			{/each}
		</ul>
	</div>
{/snippet}

<main id="main-content" class="landing-page" bind:this={main}>
	<header class="landing-nav">
		<a href="/" class="landing-brand-link" aria-label="Norviq home">
			<BrandLogo variant="full" />
		</a>
		<nav class="landing-nav-actions">
			<ThemeToggleCompact />
			<a href="https://x.com/fatc88" target="_blank" rel="noopener noreferrer" aria-label="Fernando on X" class="landing-nav-x">X</a>
			<a href="/login" class="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground sm:px-4">Log in</a>
			<PrimaryButton href="/signup" class="landing-nav-cta px-4 py-2 text-sm sm:px-5">Get started</PrimaryButton>
		</nav>
	</header>
	<section class="landing-hero-v3" data-landing-section="hero">
		<div class="hero-glow" aria-hidden="true"></div>
		<div class="hero-copy">
			<a href="#eu-tax" class="hero-pill">
				<span class="hero-pill-dot" aria-hidden="true"></span>
				Built for EU investors
				<span class="hero-pill-arrow" aria-hidden="true">&rarr;</span>
			</a>
			<h1 class="hero-title">
				<span>Nothing slips past.</span>
				<span class="hero-title-muted">Every angle of your money.</span>
			</h1>
			<p class="hero-subtitle">Norviq keeps the vigil &mdash; wealth, spending, and the signals between.</p>
			<div class="hero-store-row">
				<StoreBadges appStoreURL={vm.appStoreURL} googlePlayURL={vm.googlePlayURL} />
			</div>
			<p class="hero-web-cta">
				<span>Or on the web:</span>
				<a href="/signup" class="hero-web-link">Create a free account <span aria-hidden="true">&rarr;</span></a>
			</p>
		</div>
		<!-- heroCardWall: decorative only (aria-hidden, nothing focusable). -->
		<div class="hero-wall" aria-hidden="true">
			{#each backSlots as slot, i (i)}
				<div class="hero-wall-slot hero-wall-back" style={slot.style}>
					<HeroWallCard c={slot.card} />
				</div>
			{/each}
			{#each frontSlots as slot, i (i)}
				<div class={'hero-wall-slot hero-wall-front' + (slot.class ? ' ' + slot.class : '')} style={slot.style}>
					<HeroWallCard c={slot.card} />
				</div>
			{/each}
		</div>
	</section>
	<!-- Today's market brief, the same card signed-in users get on the dashboard.
	     Collapses (landing.css) when the endpoint has no brief. -->
	<section class="landing-section landing-market-brief" data-landing-section="market-brief" aria-label={t('Market brief')}>
		<MarketBriefShell src="/market-brief" />
	</section>
	<section class="landing-section landing-vigil" data-landing-section="vigil">
		<div class="landing-vigil-stations">
			{@render vigilStation(
				'Wealth',
				'Q never looks away from your holdings.',
				'Portfolio, crypto, and watchlists — with a 216-metric chart builder, base, bear, and bull scenarios, and due-diligence notes that keep your thesis where your money is.',
				[
					['Portfolio & watchlists', 'Holdings, allocation, and live performance in one view.'],
					['Chart builder', '216 fundamental and market metrics, plotted your way, exported as CSV.'],
					['Scenario targets', 'Base, bear, and bull cases with rationale for every position.'],
					['Research & due diligence', 'Thesis, risks, and catalysts captured while you work.']
				],
				'/static/images/screenshots/portfolio.webp',
				'Portfolio breakdown',
				false
			)}
			{@render vigilStation(
				'Spending',
				'Q guards the ledger.',
				'Budgets, receipts, and read-only bank sync — every expense accounted for, from scan to category to tax season.',
				[
					['Budget planner', 'Monthly pillars, plan items, and category tracking.'],
					['Receipt scanning', 'Point the camera at a receipt or QR and the ledger updates.'],
					['Bank sync', 'Read-only transaction import with dedupe. Your bank, untouched.'],
					['Tax overview', 'Spending and gains framed the way tax season asks for them.']
				],
				'/static/images/screenshots/expenses.webp',
				'Expenses planner',
				false
			)}
			{@render vigilStation(
				'Intelligence',
				'Q reads the signals.',
				'An AI assistant grounded in your data, live ticker sentiment, macro indicators, and MCP integrations that bring Norviq to the tools you already use.',
				[
					['AI assistant', 'Ask about your portfolio and spending. Answers come from your data.'],
					['Sentiment insights', 'Live social sentiment on the tickers you track.'],
					['Macro data', 'Inflation nowcasts and fed-watch from FRED, Eurostat, and IBGE.'],
					['MCP integrations', 'Connect Claude or any MCP client to your Norviq workspace.']
				],
				'/static/images/screenshots/home.webp',
				'Dashboard signals',
				true
			)}
		</div>
	</section>
	<section class="landing-section landing-integrations" data-landing-section="integrations" data-motion-reveal>
		<p class="landing-eyebrow">MCP inside</p>
		<h2 class="landing-section-title mt-3">Speaks to your tools.</h2>
		<p class="landing-section-lead">
			Norviq ships a Model Context Protocol server. Connect Claude or any MCP client and query your portfolio, market data, and spending from
			wherever you work &mdash; scoped tokens, OAuth 2.1, revocable any time.
		</p>
		<div class="landing-stage-pills">
			<span class="landing-pill landing-pill-soft">Claude &amp; MCP clients</span>
			<span class="landing-pill landing-pill-soft">Plaid bank sync</span>
			<span class="landing-pill landing-pill-soft">CSV import &amp; export</span>
			<span class="landing-pill landing-pill-soft">Personal access tokens</span>
			<span class="landing-pill landing-pill-soft">OAuth 2.1</span>
		</div>
	</section>
	<section class="landing-section landing-vault" data-landing-section="vault" data-motion-reveal>
		<div class="landing-vault-grid">
			<div>
				<p class="landing-eyebrow">Private by design</p>
				<h2 class="landing-section-title mt-3">The gate holds.</h2>
				<p class="landing-section-lead">
					A guardian that answers to you alone: secure account access, passkeys, exports, and account deletion are first-class flows.
				</p>
			</div>
			<div class="landing-spec-list">
				{@render specRow('Passkeys and MFA', 'Modern account protection alongside password and MFA support.')}
				{@render specRow('Private research notes', 'Thesis, risks, catalysts, and target rationale stay in your workspace.')}
				{@render specRow('Export your data', 'Download account data when you need a copy outside Norviq.')}
				{@render specRow('Delete account', 'Account deletion is wired from settings, not hidden behind support.')}
			</div>
		</div>
	</section>
	<section class="landing-section landing-pricing" data-landing-section="pricing" data-motion-reveal>
		<div class="landing-pricing-header">
			<div>
				<p class="landing-eyebrow">Free and Pro</p>
				<h2 class="landing-section-title mt-3">Simple pricing.</h2>
				<p class="landing-section-lead">Start free with tracking. Upgrade when research gets serious.</p>
			</div>
			<a href="/signup" class="instrument-action">Create free account</a>
		</div>
		<div class="mt-10 grid gap-4 md:grid-cols-2">
			{@render planCard(
				'Free',
				'Core portfolio and spending workspace',
				['Portfolio holdings and watchlists', 'Manual and CSV imports', 'Expense planning and recent spend', 'Reports overview'],
				false
			)}
			{@render planCard(
				'Pro',
				'Advanced research and planning depth',
				['AI insights and advanced research', 'Valuation cases and target alerts', 'Broker sync and recurring templates', 'Crypto, statistics, and deep market data'],
				true
			)}
		</div>
	</section>
	<section id="eu-tax" class="landing-section landing-filing" data-landing-section="filing" data-motion-reveal>
		<div class="landing-pricing-header">
			<div>
				<p class="landing-eyebrow">Tax</p>
				<h2 class="landing-section-title mt-3">IBKR to Anexo J in five minutes.</h2>
				<p class="landing-section-lead">
					Your trades and dividends, converted at the ECB rate on each day, matched FIFO, and laid out row by row the way the Portuguese return
					asks for them. Preview the numbers first; download the PDF and CSV when they look right.
				</p>
				<p class="landing-section-lead mt-2">Portugal first, Germany next. Not tax advice; check it against your broker statements.</p>
			</div>
			<a href="/signup" class="instrument-action">Start with a free account</a>
		</div>
	</section>
	<footer class="landing-footer">
		<div class="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
			<a href="/privacy" class="hover:text-foreground">Privacy Policy</a>
			<a href="/terms" class="hover:text-foreground">Terms of Use</a>
			<a href="/legal" class="hover:text-foreground">Legal notice</a>
			<a href="/security" class="hover:text-foreground">Security</a>
			<a href={DiscordURL} class="hover:text-foreground" target="_blank" rel="noopener noreferrer" data-discord-link>{t('Join us on Discord')}</a>
		</div>
		<p class="landing-footer-copy mt-4 text-center text-footnote">&copy; 2026 Norviq. Nothing slips past.</p>
	</footer>
</main>
