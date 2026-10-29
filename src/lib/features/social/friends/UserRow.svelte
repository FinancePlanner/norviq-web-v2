<script lang="ts">
	// friends.templ userRow: ListRow with the title linked to the profile and an
	// initials disc in the icon column.
	import type { Snippet } from 'svelte';
	import { initials, rowSubtitle, userTitle, type SocialUserSummary } from './types.js';

	let { user, trailing }: { user: SocialUserSummary; trailing?: Snippet } = $props();
	const subtitle = $derived(rowSubtitle(user));
</script>

<li class="nq-row">
	<span class="nq-row-icon text-subhead font-semibold" aria-hidden="true">{initials(user)}</span>
	<div class="nq-row-body">
		<a class="nq-row-title block truncate" href={'/friends/u/' + user.id}>{userTitle(user)}</a>
		{#if subtitle}
			<p class="nq-row-subtitle">{subtitle}</p>
		{/if}
	</div>
	{#if trailing}
		<div class="nq-row-trailing flex flex-wrap items-center justify-end gap-2">
			{@render trailing()}
		</div>
	{/if}
</li>
