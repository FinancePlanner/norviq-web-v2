<script lang="ts">
	// AutobuysPanel: the side panel. Every write answers with the whole panel,
	// so the list, the per-row monthly amounts and the total always agree.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import SwitchField from '#lib/components/norviq/SwitchField.svelte';
	import AutobuyForm from './AutobuyForm.svelte';
	import { autobuyChips, autobuyFormFor } from '../vm.js';
	import { terminalSend } from '../client.js';
	import type { AutobuyVM, AutobuysVM } from '../types.js';

	let { vm, onpanel }: { vm: AutobuysVM; onpanel: (vm: AutobuysVM) => void } = $props();

	const iconButtonClass =
		'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40';

	// Go: x-data="{ editing }" per item, seeded open for the item whose save just failed.
	let editing = $state<Record<string, boolean>>({});
	const isEditing = (item: AutobuyVM) => editing[item.id] ?? vm.editingID === item.id;

	async function setActive(item: AutobuyVM, checked: boolean) {
		const next = await terminalSend<AutobuysVM>(
			'POST',
			`/terminal/autobuys/${item.id}/active`,
			checked ? { active: 'true' } : {}
		);
		if (next) onpanel(next);
	}

	async function remove(item: AutobuyVM) {
		if (!confirm('Delete the ' + item.label + ' autobuy?')) return;
		const next = await terminalSend<AutobuysVM>('DELETE', `/terminal/autobuys/${item.id}`);
		if (next) onpanel(next);
	}
</script>

<div id="terminal-autobuys">
	<vigil.Panel class="space-y-4 p-5" titleID="terminal-autobuys-title">
		<vigil.PanelHeader
			id="terminal-autobuys-title"
			title="Autobuys"
			desc="Recurring buys, shown as a monthly amount."
		/>
		{#if vm.loadError}
			<p class="text-footnote text-muted-foreground">Autobuys are unavailable right now.</p>
		{:else}
			{#if vm.notice}
				<p role="alert" class="text-footnote text-destructive">{vm.notice}</p>
			{/if}
			{#if vm.items.length > 0}
				<ul class="space-y-2">
					{#each vm.items as item (item.id)}
						<li id={'terminal-autobuy-' + item.id} class="rounded-xl border border-border p-3">
							<div
								class="flex items-start justify-between gap-3"
								style:display={isEditing(item) ? 'none' : undefined}
							>
								<div class="min-w-0">
									<p class="font-semibold">
										{item.label}
										{#if item.ticker}
											<span class="text-muted-foreground">· {item.ticker}</span>
										{/if}
										{#if !item.active}
											<span class="ml-1 rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold"
												>Paused</span
											>
										{/if}
									</p>
									<p class="text-footnote text-muted-foreground">
										{item.amountLabel} · {item.cadenceLabel}
									</p>
									{#if item.needsBase}
										<p class="text-footnote text-muted-foreground">
											Add a monthly base to count this one.
										</p>
									{:else}
										<p class="text-footnote tabular-nums">{item.monthlyEquivalent} a month</p>
									{/if}
								</div>
								<div class="flex items-center gap-1">
									<SwitchField
										id={'terminal-autobuy-active-' + item.id}
										name="active"
										value="true"
										checked={item.active}
										aria-label="Active"
										onchange={(e: Event) =>
											setActive(item, (e.currentTarget as HTMLInputElement).checked)}
									/>
									<NativeButton
										class={iconButtonClass}
										aria-label={'Edit ' + item.label}
										onclick={() => (editing[item.id] = true)}
									>
										<Icon name="pencil" class="h-4 w-4" />
									</NativeButton>
									<NativeButton
										class={iconButtonClass}
										aria-label={'Delete ' + item.label}
										onclick={() => remove(item)}
									>
										<Icon name="trash-2" class="h-4 w-4" />
									</NativeButton>
								</div>
							</div>
							<div style:display={isEditing(item) ? undefined : 'none'}>
								<AutobuyForm
									form={autobuyFormFor(vm, item)}
									{onpanel}
									oncancel={() => (editing[item.id] = false)}
								/>
							</div>
						</li>
					{/each}
				</ul>
				<p class="flex justify-between border-t border-border pt-2 text-subhead font-semibold">
					<span>Monthly total</span>
					<span class="tabular-nums">{vm.monthlyTotal}</span>
				</p>
				<AutobuyForm form={vm.form} {onpanel} />
			{:else}
				<p class="text-footnote text-muted-foreground">
					No autobuys yet. Start from an example, then adjust it.
				</p>
				<AutobuyForm form={vm.form} chips={autobuyChips(vm.currencySymbol)} {onpanel} />
			{/if}
		{/if}
	</vigil.Panel>
</div>
