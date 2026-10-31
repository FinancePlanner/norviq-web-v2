<script lang="ts">
	// landing.heroWallCard + heroSparkline (landing.templ). Decorative only.
	import { budgetRingDash, heroToneClass, sparklinePaths, type HeroCard } from './landing.js';

	let { c }: { c: HeroCard } = $props();
	const spark = $derived(sparklinePaths(c.series));
</script>

{#snippet sparkline()}
	<svg class="hc-spark" viewBox="0 0 100 32" preserveAspectRatio="none">
		<path class="hc-spark-area" d={spark.area}></path>
		<path class="hc-spark-line" d={spark.line} vector-effect="non-scaling-stroke"></path>
	</svg>
{/snippet}

{#snippet lines(dotted = false)}
	<ul class={dotted ? 'hc-lines hc-lines-dotted' : 'hc-lines'}>
		{#each c.lines ?? [] as l, i (i)}
			<li><span>{l.label}</span><span class="hc-mono">{l.value}</span></li>
		{/each}
	</ul>
{/snippet}

<div class="hero-wall-sway">
	{#if c.kind === 'shot'}
		<div class="hero-card hero-card-shot">
			<img src={c.image} alt="" loading="lazy" decoding="async" width="1290" height="2640" />
		</div>
	{:else if c.kind === 'ticker'}
		<div class={'hero-card hero-card-ticker ' + heroToneClass(!!c.up)}>
			<div class="hc-head">
				<span class="hc-symbol">{c.title}</span>
				<span class="hc-delta">{c.delta}</span>
			</div>
			<span class="hc-sub">{c.sub}</span>
			<span class="hc-value hc-mono">{c.value}</span>
			{@render sparkline()}
		</div>
	{:else if c.kind === 'networth'}
		<div class="hero-card hero-card-networth is-up">
			<span class="hc-label">{c.title}</span>
			<span class="hc-value hc-big hc-mono">{c.value}</span>
			<span class="hc-delta">{c.delta}</span>
			{@render sparkline()}
		</div>
	{:else if c.kind === 'budget'}
		<div class="hero-card hero-card-budget">
			<span class="hc-label">{c.title}</span>
			<div class="hc-ring">
				<svg viewBox="0 0 36 36">
					<circle class="hc-ring-track" cx="18" cy="18" r="15.9155"></circle>
					<circle
						class="hc-ring-fill"
						cx="18"
						cy="18"
						r="15.9155"
						stroke-dasharray={budgetRingDash(c.percent ?? 0)}
					></circle>
				</svg>
				<span class="hc-ring-label hc-mono">{c.percent}%</span>
			</div>
			<span class="hc-value hc-mono">{c.value} <span class="hc-sub">{c.sub}</span></span>
			{@render lines()}
		</div>
	{:else if c.kind === 'insight'}
		<div class="hero-card hero-card-insight">
			<span class="hc-label hc-label-accent"><span class="hc-dot"></span>{c.title}</span>
			<span class="hc-value hc-mono is-down">{c.value}</span>
			<p class="hc-note">{c.note}</p>
			<ul class="hc-lines">
				{#each c.lines ?? [] as l, i (i)}
					<li>
						<span>{l.label}</span>
						<span class={'hc-mono ' + heroToneClass(l.value.startsWith('+'))}>{l.value}</span>
					</li>
				{/each}
			</ul>
		</div>
	{:else if c.kind === 'receipt'}
		<div class="hero-card hero-card-receipt">
			<span class="hc-label">{c.title}</span>
			<span class="hc-merchant">{c.sub}</span>
			{@render lines(true)}
			<div class="hc-total">
				<span class="hc-chip">{c.note}</span>
				<span class="hc-mono">{c.value}</span>
			</div>
		</div>
	{:else if c.kind === 'dividend'}
		<div class="hero-card hero-card-dividend is-up">
			<span class="hc-label">{c.title}</span>
			<span class="hc-symbol">{c.sub}</span>
			<span class="hc-value hc-big hc-mono hc-tone">{c.value}</span>
			{@render lines()}
		</div>
	{:else if c.kind === 'tax'}
		<div class="hero-card hero-card-tax">
			<span class="hc-label hc-label-accent">{c.title}</span>
			<span class="hc-sub">{c.sub}</span>
			{@render lines()}
			<span class="hc-chip hc-chip-accent">{c.note}</span>
		</div>
	{/if}
</div>
