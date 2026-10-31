<script lang="ts">
	// DEV ONLY: every Norviq kit component, for checking markup/CSS parity in
	// light and dark (use the Appearance toggle at the top).
	import Plus from '@lucide/svelte/icons/plus';
	import Wallet from '@lucide/svelte/icons/wallet';
	import * as card from '#lib/components/norviq/tui/card/index.js';
	import * as dialog from '#lib/components/norviq/tui/dialog/index.js';
	import * as table from '#lib/components/norviq/tui/table/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import {
		AIConsentCard,
		AuthBrandPanel,
		AuthMobileBrand,
		Badge,
		BrandLogo,
		BrandMark,
		buildSentimentBadge,
		buildShareLinks,
		CardHeader,
		ChartPlaceholder,
		CheckboxField,
		CollapsibleSection,
		CongressTrades,
		ConnectAgentPill,
		CopyButton,
		CSVImportFormatHint,
		EmptyState,
		EmptyStateInline,
		Field,
		FormErrorBanner,
		GhostButton,
		GoogleLogoIcon,
		Icon,
		IconButton,
		InsiderActivity,
		InstitutionalOwnership,
		ListSkeleton,
		MCPStateBadge,
		NativeButton,
		NativeSelect,
		NewsHeadlineList,
		PasswordField,
		PilotFollowingBanner,
		PinesModalShell,
		PinesSearchField,
		PrimaryButton,
		ProGatePage,
		ProGateWrap,
		SecondaryButton,
		SecondarySubmitButton,
		SectionCard,
		SegmentedControl,
		SelectField,
		SentimentBadge,
		ShareBar,
		SkeletonBlock,
		StatPill,
		StoreBadges,
		SubmitButton,
		SwitchField,
		TechnicalsStrip,
		TextareaField,
		ThemeToggle,
		ThemeToggleCompact,
		ToastBanner,
		VaultTextField,
		VigFull,
		VigMark,
		WatchlistCSVImportFormatHint,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import { enhance } from '$app/forms';
	import { animateValue, flashOnChange, pageMotion, reveal, staggerOnMount } from '#lib/motion.js';

	let email = $state('');
	let pick = $state<string | undefined>();
	let agree = $state(true);
	let notify = $state(false);
	let notes = $state('');
	let dialogOpen = $state(false);
	let pinesOpen = $state(false);
	let loading = $state(false);
	let price = $state(1234.56);
	let searchQ = $state('');
	let heroEl = $state<HTMLParagraphElement | null>(null);

	const options = [
		{ value: 'house', label: 'Home' },
		{ value: 'growth', label: 'Growth', selected: true },
		{ value: 'future', label: 'Future you', disabled: true }
	];

	const links = buildShareLinks({
		canonical: 'https://norviq.org/brief/2026-10-28',
		title: 'Market brief',
		tickers: ['AAPL', 'MSFT'],
		bullets: ['Stocks up', 'Bonds flat'],
		disclaimer: 'Not advice.',
		captionCTA: 'Read on norviq.org'
	});
</script>

<svelte:head><title>Kit gallery (dev)</title></svelte:head>

<div class="app-page-content mx-auto max-w-5xl space-y-10 p-6" {@attach pageMotion()}>
	<vigil.ModernPageHeader
		title="Norviq kit"
		subtitle="Dev-only gallery of src/lib/components/norviq"
	>
		{#snippet actions()}
			<ThemeToggle />
			<ConnectAgentPill />
		{/snippet}
	</vigil.ModernPageHeader>

	<!-- Fields -->
	<vigil.Panel titleID="g-fields">
		<vigil.PanelHeader id="g-fields" title="Fields" desc="field.templ" />
		<form
			method="POST"
			class="grid gap-4 md:grid-cols-2"
			use:enhance={withSpinner(
				() =>
					({ update }) =>
						update()
			)}
		>
			<Field
				name="email"
				label="Email"
				type="email"
				placeholder="you@example.com"
				autocomplete="email"
				bind:value={email}
			/>
			<Field
				name="amount"
				label="Amount"
				type="number"
				description="Helper text"
				error="Required"
			/>
			<PasswordField label="Password" name="password" autocomplete="current-password" />
			<VaultTextField label="Vault field" name="vault" placeholder="legacy" />
			<SelectField name="pillar" label="Pillar" {options} placeholder="Choose…" bind:value={pick} />
			<SelectField name="multi" label="Multiple" {options} multiple />
			<TextareaField name="notes" label="Notes" rows={3} autoResize bind:value={notes} />
			<NativeSelect name="kind" class="field-input" {options} />
			<CheckboxField
				name="agree"
				label="I agree"
				description="Checkbox description"
				bind:checked={agree}
			/>
			<SwitchField
				name="notify"
				label="Notify me"
				description="Switch description"
				bind:checked={notify}
			/>
			<div class="flex flex-wrap items-center gap-2 md:col-span-2">
				<SubmitButton {loading}>Save</SubmitButton>
				<SecondarySubmitButton>Save draft</SecondarySubmitButton>
				<PrimaryButton onclick={() => (loading = !loading)}>Toggle spinner</PrimaryButton>
				<SecondaryButton>Cancel</SecondaryButton>
				<GhostButton>Ghost</GhostButton>
				<GhostButton href="/__dev/kit">Ghost link</GhostButton>
				<IconButton aria-label="Add"><Plus /></IconButton>
				<NativeButton class="btn-secondary px-4">Native</NativeButton>
				<PrimaryButton fullWidth>Full width</PrimaryButton>
			</div>
			<p class="text-sm text-muted-foreground md:col-span-2">
				email={email} pick={pick} agree={agree} notify={notify} notes.length={notes.length}
			</p>
		</form>
		<FormErrorBanner message="Something went wrong." />
		<ToastBanner message="Saved." />
	</vigil.Panel>

	<!-- Kit -->
	<section class="space-y-4">
		<h2 class="text-lg font-semibold">kit.templ</h2>
		<EmptyState
			title="No holdings yet"
			description="Add a position to get started."
			actionLabel="Add"
			actionHref="/portfolio"
		/>
		<EmptyStateInline
			title="Nothing here"
			description="Inline empty state"
			actionLabel="Do it"
			actionHref="#"
		/>
		<SkeletonBlock heightClass="h-8 rounded-lg" />
		<ListSkeleton rows={2} />
		<ChartPlaceholder label="Chart placeholder" />
		<div class="grid gap-3 sm:grid-cols-3">
			<StatPill label="Net worth" value="$12,345" positive />
			<StatPill label="Cash" value="$1,000" />
		</div>
		<SegmentedControl
			items={[
				{ label: 'Kit', path: '/__dev/kit' },
				{ label: 'Login', path: '/__dev/login' }
			]}
		/>
		<SectionCard title="Section card">Body content</SectionCard>
		<CollapsibleSection title="Collapsible" desc="Starts open" open
			>Collapsible body</CollapsibleSection
		>
		<CardHeader title="Card header" desc="Description" />
	</section>

	<!-- Vigil -->
	<section class="space-y-4">
		<h2 class="text-lg font-semibold">vigil</h2>
		<vigil.Hero label="Net worth" value="$123,456.78">
			{#snippet delta()}<vigil.HeroDelta text="+2.4%" sentiment="positive" />{/snippet}
		</vigil.Hero>
		<vigil.MetricStrip>
			<vigil.Metric label="Gain" value="+$500" sentiment="positive" />
			<vigil.Metric label="Loss" value="-$20" sentiment="negative" />
			<vigil.Metric label="Flat" value="0" />
		</vigil.MetricStrip>
		<vigil.CommandSplit>
			<vigil.CommandSplitMain>
				<vigil.Panel>
					<vigil.PanelHeader title="Activity" desc="InsetList + ListRow">
						{#snippet trailing()}<a href="#top">See all</a>{/snippet}
					</vigil.PanelHeader>
					<vigil.InsetList>
						{#each ['Coffee', 'Salary', 'Rent'] as title, i (title)}
							<vigil.ListRow tone={i === 1 ? 'positive' : 'negative'} {title} subtitle="Today">
								{#snippet icon()}<Wallet class="h-5 w-5" />{/snippet}
								{#snippet trailing()}<vigil.RowTrailing
										value={i === 1 ? '+$3,000' : '-$4.50'}
										caption="Oct 28"
										sentiment={i === 1 ? 'positive' : 'negative'}
									/>{/snippet}
							</vigil.ListRow>
						{/each}
					</vigil.InsetList>
				</vigil.Panel>
			</vigil.CommandSplitMain>
			<vigil.CommandSplitAside>
				<vigil.Panel><vigil.TerminalLine text="$ norviq connect --agent" /></vigil.Panel>
			</vigil.CommandSplitAside>
		</vigil.CommandSplit>
		<vigil.CommandDeck>
			<vigil.Panel>Deck 1</vigil.Panel>
			<vigil.Panel>Deck 2</vigil.Panel>
		</vigil.CommandDeck>
		<vigil.DataTable>
			<thead><tr><th>Symbol</th><th>Shares</th></tr></thead>
			<tbody><tr><td>AAPL</td><td>10</td></tr><tr><td>MSFT</td><td>5</td></tr></tbody>
		</vigil.DataTable>
		<vigil.SettingsShell
			backHref="/settings"
			backLabel="← Settings"
			title="Settings shell"
			subtitle="Back link + header"
		>
			<p>Body</p>
		</vigil.SettingsShell>
	</section>

	<!-- templUI -->
	<section class="space-y-4">
		<h2 class="text-lg font-semibold">templUI primitives</h2>
		<div class="flex flex-wrap items-center gap-2">
			<Badge>Default</Badge><Badge variant="outline">$AAPL</Badge><Badge variant="secondary"
				>Secondary</Badge
			>
			<Badge variant="destructive">Destructive</Badge>
			<MCPStateBadge state="live">Live</MCPStateBadge><MCPStateBadge state="ready"
				>Ready</MCPStateBadge
			>
			<MCPStateBadge state="off">Off</MCPStateBadge>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			{#each ['circle-alert', 'trash-2', 'pencil', 'layers', 'house', 'sparkles', 'history'] as n (n)}
				<Icon name={n} class="h-5 w-5" />
			{/each}
			{#each ['claude', 'openai', 'cursor', 'anthropic', 'hermes'] as b (b)}
				<BrandMark name={b} class="h-5 w-5" />
			{/each}
			<GoogleLogoIcon />
		</div>
		<div class="flex items-center gap-2">
			<code id="copy-src" class="mcp-code-block rounded-xl p-3 text-sm">nq_token_123</code>
			<span class="mcp-snippet-copy"><CopyButton targetId="copy-src" /></span>
		</div>
		<card.Card>
			<card.Header
				><card.Title>Card title</card.Title><card.Description>Card description</card.Description
				></card.Header
			>
			<card.Content>Card content</card.Content>
		</card.Card>
		<table.Table class="csv-preview-table w-full text-sm">
			<table.Header
				><table.Row><table.Head>A</table.Head><table.Head>B</table.Head></table.Row></table.Header
			>
			<table.Body
				><table.Row><table.Cell>1</table.Cell><table.Cell>2</table.Cell></table.Row></table.Body
			>
		</table.Table>
		<dialog.Trigger for="g-dialog">
			<NativeButton class="btn-secondary px-5">Open dialog (Trigger for=)</NativeButton>
		</dialog.Trigger>
		<PrimaryButton onclick={() => (dialogOpen = true)}>Open dialog (bind:open)</PrimaryButton>
		<dialog.Dialog id="g-dialog" bind:open={dialogOpen}>
			<dialog.Content class="glass-card vigil-modal-panel border-0 p-6 sm:max-w-lg md:p-8">
				<dialog.Header>
					<dialog.Title>Delete account?</dialog.Title>
					<dialog.Description>This cannot be undone.</dialog.Description>
				</dialog.Header>
				<dialog.Close for="g-dialog"
					><NativeButton class="btn-secondary px-5">Cancel</NativeButton></dialog.Close
				>
			</dialog.Content>
		</dialog.Dialog>
		<PrimaryButton onclick={() => window.dispatchEvent(new CustomEvent('openQuickExpense'))}
			>Open Pines modal</PrimaryButton
		>
		<PinesModalShell
			modalID="quick-expense-modal"
			openEvent="openQuickExpense"
			title="Add expense"
			bind:open={pinesOpen}
		>
			<p>Pines modal body</p>
		</PinesModalShell>
		<PinesSearchField
			resultsId="asset-search-results"
			bind:query={searchQ}
			onsearch={(q) => console.log('search', q)}
		>
			{#snippet results(q)}<p class="p-3 text-sm">Results for "{q}"</p>{/snippet}
		</PinesSearchField>
	</section>

	<!-- Content components -->
	<section class="space-y-4">
		<h2 class="text-lg font-semibold">Content components</h2>
		<NewsHeadlineList
			items={[
				{ title: 'Fed holds rates', url: 'https://example.com', source: 'Reuters', timeAgo: '2h' },
				{ title: 'No source', url: 'https://example.com', timeAgo: '5h' }
			]}
		/>
		<div class="flex gap-2">
			<SentimentBadge vm={buildSentimentBadge('bullish', 0.42, 0.05, 12)} />
			<SentimentBadge vm={buildSentimentBadge('bearish', -0.3, -0.2, 1)} />
			<SentimentBadge vm={buildSentimentBadge('', null, null, 0)} />
		</div>
		<TechnicalsStrip
			vm={{
				present: true,
				trendLabel: 'Uptrend',
				crossLabel: 'Golden cross',
				crossTone: 'positive',
				hasRSI: true,
				rsi: '64',
				rsiHint: 'warm',
				hasMACD: true,
				macdLabel: 'bullish',
				has52Week: true,
				low52: '$120',
				high52: '$200',
				position52Label: '70% of range',
				position52Pct: 70,
				asOf: 'Oct 27'
			}}
		/>
		<InsiderActivity
			vm={{
				present: true,
				windowLabel: 'Last 90 days',
				buys: 1,
				sells: 3,
				netShares: '-12,000',
				netSharesTone: 'negative',
				clusterBuy: 'Cluster buy',
				trades: [
					{
						date: 'Oct 1',
						name: 'Jane Doe',
						title: 'CFO',
						kind: 'Sell',
						shares: '4,000',
						value: '$800K'
					}
				]
			}}
		/>
		<InstitutionalOwnership
			vm={{
				present: true,
				asOfQuarter: 'Q3 2026',
				ownershipPct: '62%',
				holdersCount: '1,204',
				holders: [{ name: 'Vanguard', shares: '1.2B', change: '+1.1%', changeTone: 'positive' }]
			}}
		/>
		<CongressTrades
			vm={{
				present: true,
				trades: [
					{
						politician: 'J. Smith',
						chamber: 'House',
						type: 'Purchase',
						amountRange: '$1K–$15K',
						transactionDate: 'Oct 2'
					}
				]
			}}
		/>
		<PilotFollowingBanner
			vm={{ pilotName: 'Buffett', followHref: '/pilots/follow/1', paused: true }}
		/>
		<CSVImportFormatHint />
		<WatchlistCSVImportFormatHint />
		<ShareBar
			{links}
			cardImageURL="/static/images/og.png"
			native
			nativeURL="https://norviq.org"
			nativeTitle="Norviq"
			event="brief_shared"
			eventProps={'{"date":"2026-10-28"}'}
			text={{
				group: 'Share',
				x: 'X',
				linkedIn: 'LinkedIn',
				reddit: 'Reddit',
				whatsApp: 'WhatsApp',
				discord: 'Discord',
				instagram: 'Instagram',
				copy: 'Copy link',
				copied: 'Copied',
				native: 'Share…'
			}}
		/>
		<StoreBadges appStoreURL="https://testflight.apple.com/join/x" googlePlayURL="" />
		<AIConsentCard next="/assistant" dismissible />
		<ProGateWrap isPro={false} featureName="Tax strategy">
			<div class="glass-card p-6">Locked preview content</div>
		</ProGateWrap>
	</section>

	<!-- Motion -->
	<section class="space-y-4">
		<h2 class="text-lg font-semibold">Motion</h2>
		<p class="nq-hero-value" data-format="$" bind:this={heroEl}>$98,765.43</p>
		<PrimaryButton onclick={() => heroEl && animateValue(heroEl, '$0.00', '$98,765.43', 800)}
			>Replay count</PrimaryButton
		>
		<p>
			Price: <span class="portfolio-row-value" {@attach flashOnChange(() => price)}
				>${price.toFixed(2)}</span
			>
			<SecondaryButton onclick={() => (price = +(price + (Math.random() - 0.5) * 50).toFixed(2))}
				>Change</SecondaryButton
			>
		</p>
		<ul class="space-y-2" {@attach staggerOnMount(':scope > li', 60)}>
			<li class="glass-card p-3">One</li>
			<li class="glass-card p-3">Two</li>
			<li class="glass-card p-3">Three</li>
		</ul>
		<div data-motion-reveal class="glass-card p-6" {@attach reveal()}>Scroll reveal</div>
	</section>

	<!-- Brand / theme / pages -->
	<section class="space-y-4">
		<h2 class="text-lg font-semibold">Brand and theme</h2>
		<ThemeToggleCompact />
		<BrandLogo variant="icon" />
		<BrandLogo variant="full" />
		<VigMark />
		<VigFull class="mx-auto h-40 w-auto" />
		<AuthMobileBrand />
		<AuthBrandPanel />
	</section>

	<ProGatePage featureName="Research" />
</div>
