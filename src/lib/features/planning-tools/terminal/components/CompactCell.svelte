<script lang="ts">
	// compactCell: shows "$10T" over the input while it is not focused; focusing
	// it reveals the full number the input holds and submits. The show/hide is
	// pure CSS (group-focus-within); blur only refreshes the label text until
	// the server's answer replaces it.
	import Field from '#lib/components/norviq/Field.svelte';
	import { compactLabel } from '../vm.js';

	let {
		rowID,
		name,
		label,
		symbol,
		value = $bindable(),
		compact = $bindable(),
		onchange
	}: {
		rowID: string;
		name: string;
		label: string;
		symbol: string;
		value: string;
		compact: string;
		onchange: (value: string) => void;
	} = $props();
</script>

<div id={`tp-${rowID}-${name}-slot`} class="group relative">
	<Field
		id={`tp-${rowID}-${name}`}
		{name}
		type="text"
		bind:value
		class="w-32 tabular-nums text-transparent focus:text-foreground"
		aria-label={label}
		autocomplete="off"
		inputmode="decimal"
		onchange={(e: Event) => onchange((e.currentTarget as HTMLInputElement).value)}
		onblur={(e: FocusEvent) => (compact = compactLabel((e.currentTarget as HTMLInputElement).value, symbol))}
	/>
	<span class="pointer-events-none absolute inset-y-0 left-3 flex items-center tabular-nums group-focus-within:hidden" aria-hidden="true">{compact}</span>
</div>
