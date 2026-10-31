<script lang="ts">
	// Row: one scenario, rendered as its own <tbody> (internal/pages/terminal/row.templ).
	//
	// A cell edit never replaces the row. Go answered the PATCH with
	// HX-Reswap: none plus out-of-band slots (the edited fields, every derived
	// value, the error, the footer); here the answer is the same data and only
	// those slots change, so a cell the reader has moved on to keeps what they
	// are typing. Inputs are never re-created, so focus stays where it is.
	import { untrack } from 'svelte';
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import Field from '#lib/components/norviq/Field.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import SecondaryButton from '#lib/components/norviq/SecondaryButton.svelte';
	import AIConsentCard from '#lib/components/norviq/AIConsentCard.svelte';
	import CompactCell from './CompactCell.svelte';
	import ShareCount from './ShareCount.svelte';
	import Progress from './Progress.svelte';
	import Suggestion from './Suggestion.svelte';
	import { terminalSend } from '../client.js';
	import type { FooterVM, RowEditResult, RowVM, SuggestionResult, WorkspaceVM } from '../types.js';

	let {
		row,
		onfooter,
		ongone,
		onworkspace
	}: {
		row: RowVM;
		onfooter: (footer: FooterVM) => void;
		ongone: () => void;
		onworkspace: (vm: WorkspaceVM) => void;
	} = $props();

	const iconButtonClass =
		'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40';

	type Editable =
		| 'ticker'
		| 'sharesOutstanding'
		| 'terminalShareCount'
		| 'terminalMarketCap'
		| 'valueWanted'
		| 'sharesOwned'
		| 'currentSharePrice';
	type Compactable =
		'sharesOutstanding' | 'terminalShareCount' | 'terminalMarketCap' | 'valueWanted';
	const compactable: Compactable[] = [
		'sharesOutstanding',
		'terminalShareCount',
		'terminalMarketCap',
		'valueWanted'
	];

	// The row is created once per workspace render (Go replaced the whole
	// workspace); from then on only cell answers change these.
	const initial = untrack(() => row);
	const id = initial.id;
	let values = $state<Record<Editable, string>>({
		ticker: initial.ticker,
		sharesOutstanding: initial.sharesOutstanding,
		terminalShareCount: initial.terminalShareCount,
		terminalMarketCap: initial.terminalMarketCap,
		valueWanted: initial.valueWanted,
		sharesOwned: initial.sharesOwned,
		currentSharePrice: initial.currentSharePrice
	});
	let compacts = $state<Record<Compactable, string>>({
		sharesOutstanding: initial.sharesOutstandingCompact,
		terminalShareCount: initial.terminalShareCountCompact,
		terminalMarketCap: initial.terminalMarketCapCompact,
		valueWanted: initial.valueWantedCompact
	});
	// The derived slots and the error slot: what the backend last computed.
	let calc = $state.raw<RowVM>(initial);
	// What names the ticker (the actions and the AI buttons): re-rendered only by a ticker edit.
	let head = $state.raw<RowVM>(initial);
	let open = $state(false);
	let suggestion = $state.raw<SuggestionResult | null>(null);

	const errorText = $derived(calc.fieldError || calc.scenarioError);

	async function edit(vals: Record<string, string>) {
		const res = await terminalSend<RowEditResult>('PATCH', `/terminal/positions/${id}`, vals);
		if (!res || res.kind === 'unknown') return;
		if (res.kind === 'gone') {
			ongone();
			return;
		}
		const next = res.row;
		for (const name of res.fields as Editable[]) {
			values[name] = next[name];
			if ((compactable as string[]).includes(name))
				compacts[name as Compactable] = next[`${name as Compactable}Compact`];
		}
		if (res.fields.includes('ticker')) {
			head = next;
			if (res.clearSuggestion) suggestion = null;
		}
		calc = next;
		if (res.footer) onfooter(res.footer);
	}

	function cell(name: Editable) {
		return (value: string) => edit({ [name]: value });
	}

	async function workspaceAction(url: string, method = 'POST', vals: Record<string, string> = {}) {
		const vm = await terminalSend<WorkspaceVM>(method, url, vals);
		if (vm) onworkspace(vm);
	}

	function move(dir: 'up' | 'down') {
		return workspaceAction(`/terminal/positions/${id}/move`, 'POST', { dir });
	}

	function remove() {
		if (!confirm('Delete the ' + head.ticker + ' scenario?')) return;
		return workspaceAction(`/terminal/positions/${id}`, 'DELETE');
	}

	async function ai(kind: 'facts' | 'scenario') {
		const res = await terminalSend<SuggestionResult>(
			'POST',
			`/terminal/positions/${id}/ai/${kind}`,
			{
				ticker: head.ticker,
				symbol: head.currencySymbol,
				currency: head.currency
			}
		);
		if (res) suggestion = res;
	}
</script>

{#snippet proBadge()}
	{#if !head.isPro}
		<span class="ml-1 rounded bg-muted px-1 text-[0.65rem] font-semibold">Pro</span>
	{/if}
{/snippet}

<tbody id={`terminal-row-${id}`} class="terminal-row">
	<tr>
		<td>
			<div id={`tp-${id}-ticker-slot`}>
				<Field
					id={`tp-${id}-ticker`}
					name="ticker"
					type="text"
					bind:value={values.ticker}
					class="w-24"
					aria-label="Ticker"
					autocomplete="off"
					onchange={(e: Event) =>
						edit({
							ticker: (e.currentTarget as HTMLInputElement).value,
							isFirst: String(head.isFirst),
							isLast: String(head.isLast)
						})}
				/>
			</div>
		</td>
		<td>
			<CompactCell
				rowID={id}
				name="sharesOutstanding"
				label="Shares outstanding"
				symbol=""
				bind:value={values.sharesOutstanding}
				bind:compact={compacts.sharesOutstanding}
				onchange={cell('sharesOutstanding')}
			/>
		</td>
		<td>
			<CompactCell
				rowID={id}
				name="terminalShareCount"
				label="Terminal share count"
				symbol=""
				bind:value={values.terminalShareCount}
				bind:compact={compacts.terminalShareCount}
				onchange={cell('terminalShareCount')}
			/>
		</td>
		<td>
			<CompactCell
				rowID={id}
				name="terminalMarketCap"
				label="Terminal market cap"
				symbol={initial.currencySymbol}
				bind:value={values.terminalMarketCap}
				bind:compact={compacts.terminalMarketCap}
				onchange={cell('terminalMarketCap')}
			/>
		</td>
		<td class="terminal-calc tabular-nums">
			<span id={`tp-${id}-derived-terminalSharePrice`}>{calc.terminalSharePrice}</span>
		</td>
		<td>
			<CompactCell
				rowID={id}
				name="valueWanted"
				label="Value wanted"
				symbol={initial.currencySymbol}
				bind:value={values.valueWanted}
				bind:compact={compacts.valueWanted}
				onchange={cell('valueWanted')}
			/>
		</td>
		<td class="terminal-calc tabular-nums">
			<span id={`tp-${id}-derived-sharesNeeded`}>
				<ShareCount full={calc.sharesNeeded} whole={calc.sharesNeededWhole} />
			</span>
		</td>
		<td>
			<div id={`tp-${id}-sharesOwned-slot`}>
				<Field
					id={`tp-${id}-sharesOwned`}
					name="sharesOwned"
					type="text"
					bind:value={values.sharesOwned}
					class="w-24 tabular-nums"
					aria-label="Shares owned"
					autocomplete="off"
					inputmode="decimal"
					onchange={(e: Event) =>
						edit({ sharesOwned: (e.currentTarget as HTMLInputElement).value })}
				/>
			</div>
		</td>
		<td class="terminal-calc">
			<div id={`tp-${id}-derived-progress`}>
				<Progress pct={calc.progressPct} label={calc.progressLabel} valid={calc.valid} />
			</div>
		</td>
		<td class="terminal-calc tabular-nums">
			<div id={`tp-${id}-derived-stillNeeded`}>
				<ShareCount full={calc.stillNeeded} whole={calc.stillNeededWhole} />
				{#if calc.valid}
					<span class="block text-footnote text-muted-foreground"
						>≈ {calc.gapValueAtTerminal} at terminal</span
					>
				{/if}
			</div>
		</td>
		<td>
			<div id={`tp-${id}-actions-slot`} class="flex items-center gap-1">
				<NativeButton
					class={iconButtonClass}
					onclick={() => (open = !open)}
					aria-expanded={open}
					aria-label={'Details for ' + head.ticker}
				>
					<Icon name="chevron-down" class="h-4 w-4" />
				</NativeButton>
				<NativeButton
					class={iconButtonClass}
					disabled={head.isFirst}
					aria-label={'Move ' + head.ticker + ' up'}
					onclick={() => move('up')}
				>
					<Icon name="arrow-up" class="h-4 w-4" />
				</NativeButton>
				<NativeButton
					class={iconButtonClass}
					disabled={head.isLast}
					aria-label={'Move ' + head.ticker + ' down'}
					onclick={() => move('down')}
				>
					<Icon name="arrow-down" class="h-4 w-4" />
				</NativeButton>
				<NativeButton
					class={iconButtonClass}
					aria-label={'Duplicate ' + head.ticker}
					onclick={() => workspaceAction(`/terminal/positions/${id}/duplicate`)}
				>
					<Icon name="copy" class="h-4 w-4" />
				</NativeButton>
				<NativeButton class={iconButtonClass} aria-label={'Delete ' + head.ticker} onclick={remove}>
					<Icon name="trash-2" class="h-4 w-4" />
				</NativeButton>
			</div>
		</td>
	</tr>
	<tr class="terminal-row-error hidden has-[[role=alert]]:table-row">
		<td colspan="11">
			<div id={`tp-${id}-error`}>
				{#if errorText}
					<p role="alert" class="text-footnote text-destructive">{errorText}</p>
				{/if}
			</div>
		</td>
	</tr>
	<tr class="terminal-row-details" style:display={open ? undefined : 'none'}>
		<td colspan="11">
			<div class="grid gap-4 py-2 md:grid-cols-[16rem_minmax(0,1fr)]">
				<div class="space-y-2">
					<div id={`tp-${id}-currentSharePrice-slot`}>
						<Field
							id={`tp-${id}-currentSharePrice`}
							name="currentSharePrice"
							label="Current share price (optional)"
							type="text"
							bind:value={values.currentSharePrice}
							placeholder="185.50"
							class="tabular-nums"
							aria-label="Current share price"
							autocomplete="off"
							inputmode="decimal"
							onchange={(e: Event) =>
								edit({ currentSharePrice: (e.currentTarget as HTMLInputElement).value })}
						/>
					</div>
					<div id={`tp-${id}-derived-capitalToday`}>
						{#if calc.capitalAtTodayPrice}
							<p class="text-footnote">
								Capital at today's price: <span class="font-semibold tabular-nums"
									>{calc.capitalAtTodayPrice}</span
								>
							</p>
						{:else}
							<p class="text-footnote text-muted-foreground">
								Add a current price to see what these shares cost today.
							</p>
						{/if}
					</div>
				</div>
				<div class="space-y-2">
					<div id={`tp-${id}-ai-actions-slot`} class="flex flex-wrap gap-2">
						<SecondaryButton onclick={() => ai('facts')}>
							Fill with AI
							{@render proBadge()}
						</SecondaryButton>
						<SecondaryButton onclick={() => ai('scenario')}>
							Suggest scenario
							{@render proBadge()}
						</SecondaryButton>
					</div>
					<div id={`terminal-ai-${id}`} aria-live="polite">
						{#if suggestion?.kind === 'consent'}
							<AIConsentCard next={suggestion.next} dismissible />
						{:else if suggestion?.kind === 'suggestion'}
							<Suggestion
								vm={suggestion.vm}
								onaccept={(vals) => edit(vals)}
								ondismiss={() => (suggestion = null)}
							/>
						{/if}
					</div>
				</div>
			</div>
		</td>
	</tr>
</tbody>
