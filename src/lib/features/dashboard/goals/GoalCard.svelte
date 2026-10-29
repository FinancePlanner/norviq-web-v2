<script lang="ts">
	// goals.goalCard(item, selected)
	import { CheckboxField } from '#lib/components/norviq/index.js';
	import type { PlanningGoalOverviewItem } from './types.js';
	import { driftClass, driftLabel, fundedWidth, money, percent } from './view.js';

	let { item, selected }: { item: PlanningGoalOverviewItem; selected: boolean } = $props();
</script>

<label class={['glass-card block p-5 transition', selected && 'ring-2 ring-success/50']}>
	<div class="flex items-start gap-4">
		<CheckboxField name="goalId" value={item.id} aria-label={'Select ' + item.goal.name} />
		<a href={'/goals?goal=' + item.id} class="min-w-0 flex-1">
			<div class="flex items-start justify-between gap-4">
				<div>
					<h3 class="font-semibold">{item.goal.name}</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						{money(item.progress.currentValue, item.goal.baseCurrency)} of {money(item.goal.targetAmount, item.goal.baseCurrency)}
					</p>
				</div>
				<span class={'text-sm font-semibold ' + driftClass(item.progress.driftState)}
					>{driftLabel(item.progress.driftState, item.progress.driftMonths)}</span
				>
			</div>
			<div class="mt-4 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
				<div class="h-full rounded-full bg-success" style={fundedWidth(item.progress.percentComplete)}></div>
			</div>
			<div class="mt-2 flex justify-between text-xs text-muted-foreground">
				<span>{percent(item.progress.percentComplete)} funded</span><span>Target {item.goal.targetDate}</span>
			</div>
		</a>
	</div>
</label>
