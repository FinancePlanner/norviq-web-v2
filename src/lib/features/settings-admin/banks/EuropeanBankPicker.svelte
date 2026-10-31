<script lang="ts">
	// Port of europeanBankPicker + BankInstitutionsList (banks.templ). Go's
	// hx-get="/settings/banks/institutions" hx-trigger="change, load" swapped an
	// HTML list into #eu-institutions; here the same URL answers JSON and this
	// component renders the list. Each bank posts to the page's connectEU
	// action, which redirects to the bank's hosted consent page (a full
	// navigation, so no use:enhance).
	import { onMount } from 'svelte';
	import { NativeButton } from '#lib/components/norviq/index.js';
	import { bankCountries, type BankInstitutionRow } from './types.js';

	let country = $state('PT');
	let institutions = $state<BankInstitutionRow[] | null>(null);
	let seq = 0;

	async function loadInstitutions(code: string) {
		const mine = ++seq;
		try {
			const res = await fetch('/settings/banks/institutions?country=' + encodeURIComponent(code));
			if (!res.ok) return; // htmx left the target untouched on an error response
			const body = (await res.json()) as { institutions: BankInstitutionRow[] };
			if (mine === seq) institutions = body.institutions ?? [];
		} catch {
			// Network failure: keep whatever is shown, as htmx did.
		}
	}

	onMount(() => {
		loadInstitutions(country);
	});
</script>

<details class="rounded-xl border border-[var(--border)] p-4">
	<summary class="cursor-pointer text-sm font-semibold">Connect a European bank</summary>
	<div class="mt-3 space-y-3">
		<label class="field-label" for="bank-country">Country</label>
		<select
			id="bank-country"
			name="country"
			class="field-input"
			bind:value={country}
			onchange={() => loadInstitutions(country)}
		>
			{#each bankCountries as [code, label] (code)}
				<option value={code}>{label}</option>
			{/each}
		</select>
		<div id="eu-institutions" class="space-y-2">
			{#if institutions !== null}
				{#if institutions.length === 0}
					<p class="text-sm text-muted-foreground">No banks found for this country.</p>
				{:else}
					<ul class="space-y-2">
						{#each institutions as inst (inst.id)}
							<li>
								<form method="POST" action="?/connectEU">
									<input type="hidden" name="institution_id" value={inst.id} />
									<NativeButton
										type="submit"
										class="flex w-full items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[color-mix(in_srgb,var(--color-tint)_8%,transparent)]"
									>
										<span>
											{inst.name}
											{#if inst.beta}
												<span
													class="ml-2 rounded-full border border-[var(--border)] px-1.5 py-0.5 text-xs opacity-70"
													>Beta</span
												>
											{/if}
										</span>
										<span class="opacity-50">Connect →</span>
									</NativeButton>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</div>
	</div>
</details>
