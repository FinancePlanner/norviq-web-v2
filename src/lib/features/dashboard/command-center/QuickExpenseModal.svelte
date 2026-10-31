<script lang="ts">
	// dashboard.QuickExpenseModal + assets/quick-expense.js. The form posts to
	// /dashboard/quick-expense: 204 closes the modal (Go also refreshed
	// #activity-feed / #recent-spend-panel, which live on /dashboard/pulse, not
	// on this page); an error renders the banner into #quick-expense-feedback.
	import PinesModalShell from '#lib/components/norviq/PinesModalShell.svelte';
	import VaultTextField from '#lib/components/norviq/VaultTextField.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import SecondaryButton from '#lib/components/norviq/SecondaryButton.svelte';
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import { resolvePillars } from '../pillars.js';
	import { isoDate } from '../shared.js';

	let open = $state(false);
	let error = $state('');
	let busy = $state(false);
	const options = resolvePillars().map((p) => ({ value: p.key, label: p.label }));
	const today = isoDate(new Date());

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		busy = true;
		error = '';
		try {
			const res = await fetch('/dashboard/quick-expense', {
				method: 'POST',
				body: new FormData(form),
				headers: { accept: 'application/json' }
			});
			if (res.status === 204) {
				window.dispatchEvent(new CustomEvent('closeQuickExpense'));
				return;
			}
			error =
				((await res.json().catch(() => null)) as { error?: string } | null)?.error ??
				'Could not save expense. Try again.';
		} catch {
			error = 'Could not save expense. Try again.';
		} finally {
			busy = false;
		}
	}
</script>

<PinesModalShell
	modalID="quick-expense-modal"
	openEvent="openQuickExpense"
	title="Add expense"
	bind:open
>
	<form
		id="quick-expense-form"
		class={['quick-expense-form space-y-4', busy && 'htmx-request']}
		method="POST"
		action="/dashboard/quick-expense"
		onsubmit={submit}
	>
		<div id="quick-expense-feedback"><FormErrorBanner message={error} /></div>
		<VaultTextField label="Title" name="title" placeholder="Groceries" required />
		<VaultTextField label="Amount" name="amount" placeholder="42.50" required />
		<SelectField
			id="quick-expense-pillar"
			name="pillar"
			label="Pillar"
			required
			wrapperClass="space-y-2"
			{options}
		/>
		<VaultTextField label="Date" name="occurred_on" inputType="date" value={today} required />
		<div class="flex flex-wrap gap-3 pt-2">
			<SubmitButton class="w-auto px-6">Save expense</SubmitButton>
			<SecondaryButton class="px-6" onclick={() => (open = false)}>Cancel</SecondaryButton>
		</div>
	</form>
</PinesModalShell>
