<script lang="ts">
	// components.PinesSearchField(searchURL, resultsTargetID) — the market search
	// combobox. The Go version hx-get'd an HTML fragment into the results div;
	// here the page owns fetching: `onsearch(q)` fires 280ms after typing stops
	// (immediately on the search event / Enter-clear), and the `results` snippet
	// renders inside #resultsId. The panel shows on focus/input and hides on a
	// click inside it or outside the field.
	import type { Snippet } from 'svelte';
	import Icon from './tui/Icon.svelte';

	let {
		resultsId,
		query = $bindable(''),
		onsearch,
		results
	}: {
		resultsId: string;
		query?: string;
		onsearch?: (q: string) => void;
		results?: Snippet<[string]>;
	} = $props();

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let last = '';

	function fire(q: string) {
		clearTimeout(timer);
		if (q === last) return;
		last = q;
		onsearch?.(q);
	}

	$effect(() => () => clearTimeout(timer));
</script>

<svelte:document
	onclick={(e) => {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}}
/>

<div class="pines-search" bind:this={root}>
	<label class="sr-only" for="asset-search-input">Search stocks and ETFs</label>
	<div class="pines-search-input-wrap">
		<Icon name="search" class="pines-search-icon" />
		<input
			id="asset-search-input"
			name="q"
			type="search"
			class="pines-search-input field-input"
			placeholder="Search symbol or company…"
			autocomplete="off"
			bind:value={query}
			onfocus={() => (open = true)}
			oninput={(e) => {
				open = true;
				const q = e.currentTarget.value;
				clearTimeout(timer);
				timer = setTimeout(() => fire(q), 280);
			}}
			{@attach (el: HTMLInputElement) => {
				const onSearchEvent = () => fire(el.value);
				el.addEventListener('search', onSearchEvent);
				return () => el.removeEventListener('search', onSearchEvent);
			}}
		/>
	</div>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -- results are links; the click only closes the panel -->
	<div id={resultsId} class="pines-search-results" style:display={open ? undefined : 'none'} onclick={() => (open = false)}>
		{@render results?.(query)}
	</div>
</div>
