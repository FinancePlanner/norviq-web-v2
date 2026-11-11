<script lang="ts">
	// One weekly digest as a document: headline and period, the narrative when
	// there is one, a short contents row, then each section's figures as rows.
	// The email's ?s=<anchor> scrolls to that section and marks it briefly.
	import { onMount } from 'svelte';
	import { EmptyState } from '#lib/components/norviq/index.js';
	import { locale, t } from '#lib/i18n/context.svelte.js';
	import {
		dayLabel,
		monthLabel,
		periodLabel,
		type DigestAnchor,
		type DigestPageViewModel,
		type Direction,
		type EarningRow
	} from './viewmodel.js';

	let { vm, focus = null }: { vm: DigestPageViewModel; focus?: DigestAnchor | null } = $props();

	const lang = $derived(locale());
	const navLabels: Record<DigestAnchor, string> = {
		holdings: 'Holdings',
		movers: 'Movers',
		budget: 'Budget',
		inflation: 'Inflation',
		earnings: 'Earnings'
	};
	const arrow: Record<Direction, string> = { up: '▲', down: '▼', flat: '' };
	const timingLabel: Record<NonNullable<EarningRow['timing']>, string> = {
		'before-open': 'Before open',
		'after-close': 'After close',
		during: 'During market hours'
	};

	onMount(() => {
		if (!focus) return;
		const el = document.getElementById('digest-' + focus);
		if (!el) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
	});
</script>

<article class="digest">
	<header class="digest-head">
		<h1 class="digest-title">{vm.headline}</h1>
		<p class="digest-period">
			<time datetime={vm.periodStart}>{periodLabel(vm.periodStart, vm.periodEnd, lang)}</time>
			<span aria-hidden="true">·</span>
			{t('Weekly digest')}
		</p>
		{#if vm.narrative}
			<p class="digest-narrative">{vm.narrative}</p>
		{/if}
		{#if vm.sections.length > 1}
			<nav class="digest-contents" aria-label={t('In this digest')}>
				{#each vm.sections as section (section.anchor)}
					<a href={'#digest-' + section.anchor} aria-current={focus === section.anchor || undefined}
						>{t(navLabels[section.anchor])}</a
					>
				{/each}
			</nav>
		{/if}
	</header>

	{#if vm.sections.length === 0}
		<div class="digest-empty">
			<EmptyState
				title={t('Nothing to report this week')}
				description={t('Your next digest will show holdings, budget and upcoming earnings.')}
			/>
		</div>
	{/if}

	{#each vm.sections as section (section.anchor)}
		<section
			id={'digest-' + section.anchor}
			class="digest-section"
			class:is-focus={focus === section.anchor}
			aria-labelledby={'digest-' + section.anchor + '-title'}
		>
			<h2 id={'digest-' + section.anchor + '-title'} class="digest-section-title">
				{t(section.title)}
			</h2>

			{#if section.anchor === 'holdings'}
				<ul class="digest-holdings">
					{#each section.rows as row (row.currency)}
						<li>
							<span class="digest-figure">{row.value}</span>
							<span class="digest-delta is-{row.direction}">
								{#if arrow[row.direction]}<span aria-hidden="true">{arrow[row.direction]}</span
									>{/if}
								{row.change}{#if row.changePercent}&nbsp;({row.changePercent}){/if}
								<span class="sr-only">{t('this week')}</span>
							</span>
						</li>
					{/each}
				</ul>
				{#if section.priced < section.total}
					<p class="digest-note">
						{t('Based on %d of %d holdings with prices this week.', section.priced, section.total)}
					</p>
				{/if}
			{:else if section.anchor === 'movers'}
				<div class="digest-table-wrap">
					<table class="digest-table">
						<thead>
							<tr>
								<th scope="col">{t('Symbol')}</th>
								<th scope="col" class="is-num">{t('Week')}</th>
								<th scope="col" class="is-num">{t('Effect on holdings')}</th>
							</tr>
						</thead>
						<tbody>
							{#each section.rows as row (row.symbol)}
								<tr>
									<th scope="row">
										<span class="digest-symbol">{row.symbol}</span>
										{#if row.why}<span class="digest-why">{row.why}</span>{/if}
									</th>
									<td class="is-num is-{row.direction}">{row.changePercent}</td>
									<td class="is-num is-{row.direction}">{row.contribution}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else if section.anchor === 'budget'}
				<p class="digest-note">{monthLabel(section.monthStart, lang)}</p>
				<div class="digest-table-wrap">
					<table class="digest-table">
						<thead>
							<tr>
								<th scope="col">{t('Category')}</th>
								<th scope="col" class="is-num">{t('Spent')}</th>
								<th scope="col" class="is-num">{t('Budget')}</th>
								<th scope="col" class="is-num">{t('Difference')}</th>
							</tr>
						</thead>
						<tbody>
							{#each section.rows as row, i (i)}
								<tr>
									<th scope="row">{row.title}</th>
									<td class="is-num">{row.actual}</td>
									<td class="is-num digest-muted">{row.target}</td>
									<td class="is-num" class:is-over={row.over}>
										{row.over ? t('%s over', row.drift) : t('%s under', row.drift)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else if section.anchor === 'inflation'}
				<dl class="digest-pair">
					<div>
						<dt>{t('Yours')}</dt>
						<dd class="digest-figure">{section.personal}</dd>
					</div>
					<div>
						<dt>{t('Official')}</dt>
						<dd class="digest-figure digest-muted">{section.official}</dd>
					</div>
				</dl>
				<p class="digest-note">
					{section.country} · {monthLabel(section.asOf, lang)}
				</p>
			{:else if section.anchor === 'earnings'}
				<p class="digest-note">{t('Earnings dates for holdings you own.')}</p>
				<div class="digest-table-wrap">
					<table class="digest-table is-grouped">
						<thead>
							<tr>
								<th scope="col">{t('Date')}</th>
								<th scope="col">{t('Symbol')}</th>
								<th scope="col">{t('Timing')}</th>
							</tr>
						</thead>
						<tbody>
							{#each section.rows as row (row.symbol + row.date)}
								<tr class:is-group-start={row.firstOfDate}>
									<td class="digest-date">
										<time datetime={row.date} class:sr-only={!row.firstOfDate}
											>{dayLabel(row.date, lang)}</time
										>
									</td>
									<th scope="row"><span class="digest-symbol">{row.symbol}</span></th>
									<td class="digest-muted">{row.timing ? t(timingLabel[row.timing]) : '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{/each}

	<footer class="digest-foot">
		{t("Numbers come from your holdings' closing prices and your budget. Not investment advice.")}
	</footer>
</article>

<style>
	.digest {
		max-width: 44rem;
	}

	.digest-head {
		padding-bottom: 1.5rem;
	}

	.digest-title {
		margin: 0;
		font-size: clamp(1.625rem, 1.2rem + 1.4vw, 2.125rem);
		line-height: 1.15;
		font-weight: 700;
		letter-spacing: -0.02em;
		text-wrap: balance;
		color: var(--foreground);
	}

	.digest-period {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin: 0.5rem 0 0;
		font-size: var(--label-size-sm);
		color: var(--muted-foreground);
	}

	.digest-narrative {
		max-width: 65ch;
		margin: 1.25rem 0 0;
		font-size: 1rem;
		line-height: 1.6;
		text-wrap: pretty;
		color: var(--foreground);
	}

	.digest-contents {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
		margin-top: 1.25rem;
		font-size: var(--label-size-sm);
		font-weight: 500;
	}

	.digest-contents a {
		padding: 0.375rem 0;
		color: var(--muted-foreground);
		text-decoration: underline;
		text-decoration-color: transparent;
		text-underline-offset: 0.3em;
		transition:
			color var(--motion-fast, 140ms) ease-out,
			text-decoration-color var(--motion-fast, 140ms) ease-out;
	}

	.digest-contents a:hover,
	.digest-contents a[aria-current] {
		color: var(--color-tint);
		text-decoration-color: currentColor;
	}

	.digest-contents a:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: 2px;
	}

	/* The arrival tint bleeds 1rem past the column; the rule stays on it. */
	.digest-section {
		position: relative;
		scroll-margin-top: 1.5rem;
		padding: 1.5rem 1rem;
		margin-inline: -1rem;
		border-radius: 0.5rem;
	}

	.digest-section::before {
		content: '';
		position: absolute;
		top: 0;
		inset-inline: 1rem;
		border-top: 1px solid var(--hairline, var(--border));
	}

	.digest-section.is-focus {
		animation: digest-arrive 2.4s var(--ease-decelerate, cubic-bezier(0.22, 1, 0.36, 1)) 0.3s both;
	}

	@keyframes digest-arrive {
		from {
			background-color: var(--color-tint-soft);
		}
		to {
			background-color: transparent;
		}
	}

	.digest-empty {
		margin-bottom: 1.5rem;
	}

	.digest-section-title {
		margin: 0;
		font-size: var(--label-size-lg);
		font-weight: 600;
		line-height: 1.3;
		color: var(--foreground);
	}

	.digest-note {
		margin: 0.25rem 0 0;
		font-size: var(--label-size-sm);
		line-height: 1.45;
		color: var(--muted-foreground);
	}

	.digest-muted {
		color: var(--muted-foreground);
	}

	.digest-figure {
		font-size: 1.75rem;
		line-height: 1.1;
		font-weight: 600;
		letter-spacing: -0.015em;
		font-variant-numeric: tabular-nums;
		color: var(--foreground);
	}

	.digest-holdings {
		display: grid;
		gap: 1rem;
		margin: 0.875rem 0 0;
		padding: 0;
		list-style: none;
	}

	.digest-holdings li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.375rem 0.875rem;
	}

	.digest-delta {
		display: inline-flex;
		align-items: baseline;
		gap: 0.3rem;
		font-size: var(--label-size);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--muted-foreground);
	}

	.digest-delta span[aria-hidden] {
		font-size: 0.7em;
	}

	.is-up {
		color: var(--color-gain);
	}

	.is-down {
		color: var(--color-loss);
	}

	.digest-table-wrap {
		margin-top: 0.75rem;
		overflow-x: auto;
	}

	.digest-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--label-size-sm);
	}

	.digest-table thead th {
		padding: 0 0.75rem 0.5rem 0;
		font-weight: 500;
		text-align: left;
		color: var(--muted-foreground);
		white-space: nowrap;
	}

	.digest-table tbody th,
	.digest-table tbody td {
		padding: 0.625rem 0.75rem 0.625rem 0;
		border-top: 1px solid var(--hairline, var(--border));
		text-align: left;
		vertical-align: baseline;
		font-weight: 400;
	}

	.digest-table.is-grouped {
		width: auto;
		min-width: min(100%, 26rem);
	}

	.digest-table.is-grouped .digest-date {
		width: 9rem;
	}

	.digest-table.is-grouped th[scope='row'] {
		width: 6rem;
	}

	/* Earnings: one rule per date, the date printed once. */
	.digest-table.is-grouped tbody tr:not(.is-group-start) td,
	.digest-table.is-grouped tbody tr:not(.is-group-start) th {
		border-top-color: transparent;
		padding-top: 0.125rem;
	}

	.digest-table .is-num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.digest-table th:last-child,
	.digest-table td:last-child {
		padding-right: 0;
	}

	.digest-table td.is-over {
		color: var(--color-warning);
		font-weight: 600;
	}

	.digest-symbol {
		font-weight: 600;
		color: var(--foreground);
	}

	.digest-why {
		display: block;
		max-width: 48ch;
		margin-top: 0.125rem;
		color: var(--muted-foreground);
		line-height: 1.45;
	}

	.digest-date {
		white-space: nowrap;
		color: var(--foreground);
	}

	.digest-pair {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 2.5rem;
		margin: 0.875rem 0 0;
	}

	.digest-pair dt {
		font-size: var(--label-size-sm);
		color: var(--muted-foreground);
	}

	.digest-pair dd {
		margin: 0.125rem 0 0;
	}

	.digest-foot {
		padding-top: 1.25rem;
		border-top: 1px solid var(--hairline, var(--border));
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--muted-foreground);
	}

	@media (prefers-reduced-motion: reduce) {
		.digest-section.is-focus {
			animation: none;
		}
	}
</style>
