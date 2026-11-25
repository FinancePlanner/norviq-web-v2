<script lang="ts">
	// The editorial brief: Norviq Market Intelligence, The Open or The Close.
	// Server-rendered; charts are SVG paths computed in edition/map.ts, so the
	// page needs no charting code in the browser.
	import PrimaryButton from '#lib/components/norviq/PrimaryButton.svelte';
	import ShareBar from '#lib/components/norviq/ShareBar.svelte';
	import { translator } from '#lib/i18n/index.js';
	import ExportTrigger from './export/ExportTrigger.svelte';
	import CrossAsset from './edition/CrossAsset.svelte';
	import IntradayChart from './edition/IntradayChart.svelte';
	import Masthead from './edition/Masthead.svelte';
	import Methodology from './edition/Methodology.svelte';
	import Scorecards from './edition/Scorecards.svelte';
	import Stories from './edition/Stories.svelte';
	import StoryMeta from './edition/StoryMeta.svelte';
	import './edition/brief.css';
	import type { BriefPageVM } from './brief.server.js';

	let { vm }: { vm: BriefPageVM } = $props();
	const t = $derived(translator(vm.lang));
	const L = $derived(vm.labels);
	const ed = $derived(vm.edition);
	const close = $derived(ed.kind === 'close');
</script>

<svelte:head>
	<title>{vm.documentTitle}</title>
	<meta name="description" content={vm.description} />
	<meta name="robots" content="index,follow,max-image-preview:large" />
	<link rel="canonical" href={vm.canonicalURL} />
	<link rel="alternate" hreflang="en" href={vm.englishURL} />
	<link rel="alternate" hreflang="pt-PT" href={vm.portugueseURL} />
	<link rel="alternate" hreflang="x-default" href={vm.englishURL} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="Norviq" />
	<meta property="og:locale" content={vm.ogLocale} />
	<meta property="og:locale:alternate" content={vm.ogLocaleAlternate} />
	<meta property="og:url" content={vm.canonicalURL} />
	<meta property="og:title" content={vm.documentTitle} />
	<meta property="og:description" content={vm.description} />
	<meta property="og:image" content={vm.ogImageURL} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={vm.title} />
	{#if vm.publishedISO}
		<meta property="article:published_time" content={vm.publishedISO} />
		<meta property="article:modified_time" content={vm.modifiedISO || vm.publishedISO} />
	{/if}
	<meta property="article:section" content="Market Intelligence" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@NorviqPlanner" />
	<meta name="twitter:title" content={vm.documentTitle} />
	<meta name="twitter:description" content={vm.description} />
	<meta name="twitter:image" content={vm.ogImageURL} />
	{#if vm.jsonLD}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- Go-style escaped JSON (<, >, & as \u00XX) -->
		{@html '<script type="application/ld+json">' + vm.jsonLD + '</scr' + 'ipt>'}
	{/if}
</svelte:head>

<main id="main-content" class="mi" data-market-brief-page data-edition={ed.editionId}>
	<Masthead
		labels={L}
		editionName={ed.editionName}
		dateLong={ed.dateLong}
		dateISO={vm.brief.tradingDateISO}
		previousURL={vm.previousURL}
		latestURL={vm.latestURL}
		otherLanguageURL={vm.otherLanguageURL}
		otherLanguageCode={vm.otherLanguageCode}
		otherLanguageLabel={vm.otherLanguageLabel}
		signedIn={vm.signedIn}
	/>
	<article aria-labelledby="market-brief-heading">
		<header class="mi-hero">
			<p class="mi-label mi-label--gold">{ed.editionName} · {ed.dateLong}</p>
			<h1 id="market-brief-heading">{ed.headline}</h1>
			{#if ed.dek}
				<p class="mi-dek">{ed.dek}</p>
			{/if}
			<dl class="mi-meta">
				{#if ed.publishedTime}
					<div>
						<dt>{L.published}</dt>
						<dd>
							<time datetime={vm.publishedISO}>{ed.publishedTime}</time>
							{L.lisbonTime}
						</dd>
					</div>
				{/if}
				{#if ed.dataAsOfTime}
					<div>
						<dt>{L.marketDataAsOf}</dt>
						<dd>{ed.dataAsOfTime} {L.lisbonTime}</dd>
					</div>
				{/if}
				<div>
					<dt>{L.edition}</dt>
					<dd>
						{ed.editionId}{#if ed.revision}&nbsp;· r{ed.revision}{/if}
					</dd>
				</div>
				{#if ed.degraded}
					<div><span class="mi-badge">{L.limitedSources}</span></div>
				{/if}
			</dl>
		</header>

		{#if ed.groups.length}
			<Scorecards
				title={L.marketsAtAGlance}
				groups={ed.groups}
				note={ed.hasEdition ? L.glanceNote : ''}
			/>
		{/if}

		<div class="mi-body">
			<div class="mi-main">
				{#if ed.chart}
					<IntradayChart
						title={L.marketPerformance}
						chart={ed.chart}
						tableLabel={L.showChartData}
					/>
				{/if}
				<Stories
					lead={ed.lead}
					developments={ed.developments}
					leadTitle={L.leadStory}
					developmentsTitle={close ? L.developmentsClose : L.developmentsOpen}
					sourceLabel={L.source}
				/>
				{#if ed.earnings.length}
					<section aria-labelledby="mi-watch-title">
						<h2 id="mi-watch-title" class="mi-section-title">{L.whatToWatch}</h2>
						<h3 class="mi-label">{L.earningsToday}</h3>
						<ul class="mi-stories" role="list">
							{#each ed.earnings as story (story.rank)}
								<li>
									<span class="mi-rank" aria-hidden="true">·</span>
									<div>
										<p>{story.text}</p>
										<StoryMeta {story} sourceLabel={L.source} />
									</div>
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			</div>
			<aside class="mi-rail" aria-label={L.context}>
				{#if ed.crossAsset.length}
					<CrossAsset
						title={L.acrossAssetClasses}
						sections={ed.crossAsset}
						columns={{ name: L.instrument, level: L.level, change: L.change }}
					/>
				{/if}
				<Methodology
					labels={L}
					editionId={ed.editionId}
					revision={ed.revision}
					publishedTime={ed.publishedTime}
					dataAsOfTime={ed.dataAsOfTime}
					hasEdition={ed.hasEdition}
					degraded={ed.degraded}
					sources={ed.sources}
					missing={ed.missing}
				/>
			</aside>
		</div>
	</article>

	<section id="share" class="mi-share scroll-mt-6" aria-labelledby="market-brief-share-heading">
		<h2 id="market-brief-share-heading" class="mi-section-title">{L.shareThisEdition}</h2>
		<ShareBar
			links={vm.share}
			native
			nativeURL={vm.nativeShareURL}
			nativeTitle={vm.title}
			event="market_brief_shared"
			eventProps={vm.shareProps}
			text={{
				group: t('Share this brief'),
				x: t('Share on X'),
				linkedIn: 'LinkedIn',
				reddit: 'Reddit',
				whatsApp: 'WhatsApp',
				discord: t('Copy for Discord'),
				copy: t('Copy link'),
				copied: t('Copied'),
				native: t('Share…')
			}}
		/>
		<ExportTrigger
			href={vm.exportFallback.social}
			label={L.exportOpen}
			studio={{
				exportsURL: vm.exportsURL,
				fallback: vm.exportFallback,
				copyURL: vm.share.copy,
				nativeURL: vm.nativeShareURL,
				title: vm.title,
				eventProps: vm.shareProps,
				text: L
			}}
		/>
	</section>
	{#if !vm.signedIn}
		<section class="mi-cta" data-market-brief-cta>
			<div>
				<h2>{L.ctaTitle}</h2>
				<p>
					{L.ctaBody}
				</p>
			</div>
			<PrimaryButton href="/signup" class="w-auto px-6">{L.ctaButton}</PrimaryButton>
		</section>
	{/if}
	<footer class="mi-footer">
		<span>Norviq · {L.marketIntelligence} · {ed.editionId}</span>
		<span>
			<a href="/terms">{L.terms}</a>
			<span aria-hidden="true">·</span>
			<a href="/privacy">{L.privacy}</a>
		</span>
	</footer>
</main>
