<script lang="ts" module>
	/** components.PilotFollowingVM */
	export interface PilotFollowingVM {
		pilotName: string;
		followHref: string;
		paused?: boolean;
	}

	/** components.PilotFollowingFor — lookup keyed by lower-cased, trimmed portfolio id. */
	export function pilotFollowingFor(
		m: Record<string, PilotFollowingVM> | null | undefined,
		portfolioID: string
	): PilotFollowingVM | undefined {
		return m?.[portfolioID.trim().toLowerCase()];
	}
</script>

<script lang="ts">
	// components.PilotFollowingBanner(vm)
	let { vm }: { vm: PilotFollowingVM } = $props();
</script>

<div
	class="mt-4 rounded-lg border border-[var(--color-tint)]/25 bg-[var(--color-tint)]/5 px-4 py-3 text-sm"
	role="note"
	data-pilot-following="true"
>
	<p>
		<span class="font-medium">{'Following ' + vm.pilotName}</span>
		{#if vm.paused}
			<span class="text-muted-foreground">{' (paused)'}</span>
		{/if}
	</p>
	<p class="mt-1 text-muted-foreground">
		Trades here are simulated copies of disclosed trades. Stop following to edit by hand.
	</p>
	<a class="mt-2 inline-block font-medium hover:text-[var(--color-tint)]" href={vm.followHref}>View follow</a>
</div>
