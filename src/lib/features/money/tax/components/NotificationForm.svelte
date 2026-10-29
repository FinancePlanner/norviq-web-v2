<script lang="ts">
	// tax.notificationForm (POST /tax/notifications → /tax?/notifications).
	import { enhance } from '$app/forms';
	import { CheckboxField, Field, SecondarySubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import { optionalFloat } from '../helpers.js';
	import type { TaxPageViewModel } from '../types.js';

	let { vm }: { vm: TaxPageViewModel } = $props();
</script>

<form method="POST" action="/tax?/notifications" use:enhance={withSpinner()} class="glass-card self-start p-6">
	<h2 class="text-xl font-semibold">Opportunity alerts</h2>
	<CheckboxField name="enabled" label="Notify me about actionable opportunities" checked={vm.notifications.enabled} wrapperClass="mt-4" />
	<input type="hidden" name="jurisdiction" value={vm.jurisdiction} /><input type="hidden" name="taxYear" value={vm.taxYear} />
	<Field
		name="minimumBenefit"
		label="Minimum benefit"
		type="number"
		value={optionalFloat(vm.notifications.minimumBenefit)}
		class="mt-2"
		wrapperClass="mt-4 block"
		min="0"
		step="0.01"
	/>
	<Field
		name="cooldownDays"
		label="Cooldown days"
		type="number"
		value={String(vm.notifications.cooldownDays)}
		class="mt-2"
		wrapperClass="mt-4 block"
		min="1"
		max="30"
	/>
	<p class="mt-3 text-sm text-muted-foreground">
		The platform minimum remains 250 or 0.5% of taxable portfolio value, whichever is greater.
	</p>
	<SecondarySubmitButton class="mt-5">Save alerts</SecondarySubmitButton>
</form>
