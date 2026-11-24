<script lang="ts">
	// C. Markets at a glance: one card per instrument, grouped by session.
	import { SPARK_H, SPARK_W } from './chart.js';
	import type { ScoreGroupVM } from './types.js';

	let { title, groups, note }: { title: string; groups: ScoreGroupVM[]; note: string } = $props();
</script>

<section class="mi-glance" aria-labelledby="mi-glance-title">
	<h2 id="mi-glance-title" class="mi-section-title">{title}</h2>
	<div class="mi-glance__groups">
		{#each groups as group (group.id)}
			<div>
				<h3 class="mi-group-title">{group.title}</h3>
				<ul class="mi-cards" role="list">
					{#each group.cards as card (card.symbol)}
						<li class="mi-card">
							<p class="sr-only">{card.label}</p>
							<div aria-hidden="true">
								<p class="mi-card__name">{card.name}</p>
								<p class="mi-card__meta">{card.meta}</p>
								<p class="mi-card__level">{card.level}</p>
								<p class="mi-card__move mi-{card.direction}">
									{#if card.change}<span>{card.change}</span>{/if}
									<span>{card.changePct}</span>
								</p>
								{#if card.spark}
									<svg
										class="mi-card__spark mi-{card.direction}"
										viewBox="0 0 {SPARK_W} {SPARK_H}"
										preserveAspectRatio="none"
									>
										{#if card.spark.baseline !== null}
											<line
												x1="0"
												x2={SPARK_W}
												y1={card.spark.baseline}
												y2={card.spark.baseline}
												stroke="currentColor"
												stroke-opacity="0.35"
												stroke-dasharray="2 2"
												vector-effect="non-scaling-stroke"
											/>
										{/if}
										<path
											d={card.spark.path}
											fill="none"
											stroke="currentColor"
											stroke-width="1.5"
											vector-effect="non-scaling-stroke"
										/>
									</svg>
								{/if}
							</div>
							{#if card.asOf}
								<p class="mi-card__asof">{card.asOf}</p>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
	{#if note}
		<p class="mi-chart__note">{note}</p>
	{/if}
</section>
