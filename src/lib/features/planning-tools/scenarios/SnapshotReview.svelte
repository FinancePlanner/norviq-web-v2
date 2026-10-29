<script lang="ts">
	// scenarios.SnapshotReview(snapshot, values). The frozen snapshot plus every
	// submitted field echoed back as hidden inputs; "Run reviewed snapshot"
	// posted (hx-post) to /scenarios/runs, or to
	// /scenarios/configurations/{id}/runs for a saved scenario, with its errors
	// targeted at #scenario-form-error. Success was an HX-Redirect.
	import { SubmitButton } from '#lib/components/norviq/index.js';
	import { postForm } from './client.js';
	import type { FormValues, RedirectResponse, ScenarioSnapshot } from './types.js';
	import { resultJSON, uid } from './view.js';

	let {
		snapshot,
		values,
		onformerror,
		onredirect
	}: {
		snapshot: ScenarioSnapshot;
		values: FormValues;
		onformerror: (message: string) => void;
		onredirect: (to: string) => void;
	} = $props();

	// snapshotRunAction
	const action = $derived.by(() => {
		const ids = values.filter(([name]) => name === 'savedScenarioId').map(([, value]) => value);
		if (ids.length === 1 && ids[0] !== '') return '/scenarios/configurations/' + ids[0] + '/runs';
		return '/scenarios/runs';
	});

	let pending = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		pending = true;
		const result = await postForm<RedirectResponse>(action, new FormData(event.currentTarget as HTMLFormElement));
		pending = false;
		if (result?.kind === 'redirect') onredirect(result.to);
		else if (result?.kind === 'formError') onformerror(result.message);
	}
</script>

<section class="rounded-lg border border-warning/30 bg-warning/5 p-5" aria-labelledby="snapshot-review-title">
	<h3 id="snapshot-review-title" class="font-semibold">Review frozen snapshot</h3>
	<p class="mt-1 text-sm text-muted-foreground">Prices, FX rates, classifications, and risk metadata are now immutable for this run.</p>
	{#if snapshot.warnings != null}
		<details class="mt-4" open>
			<summary class="cursor-pointer text-sm font-medium">Data-quality and proxy warnings</summary>
			<pre class="mt-2 max-h-48 overflow-auto rounded-xl bg-black/5 p-3 text-xs">{resultJSON(snapshot.warnings)}</pre>
		</details>
	{/if}
	{#if snapshot.payload != null}
		<details class="mt-3">
			<summary class="cursor-pointer text-sm font-medium">Frozen holdings and valuations</summary>
			<pre class="mt-2 max-h-64 overflow-auto rounded-xl bg-black/5 p-3 text-xs">{resultJSON(snapshot.payload)}</pre>
		</details>
	{/if}
	<form class="mt-4" class:htmx-request={pending} onsubmit={submit}>
		<input type="hidden" name="snapshotId" value={uid(snapshot.id)} />
		{#each values as [name, value], i (i)}
			<input type="hidden" {name} {value} />
		{/each}
		<SubmitButton class="w-full">Run reviewed snapshot</SubmitButton>
	</form>
</section>
