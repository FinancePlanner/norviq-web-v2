<script lang="ts">
	// boards.templ banners(viewer, notice, errorText).
	import type { Viewer } from './boards.js';

	let {
		viewer,
		notice = '',
		errorText = ''
	}: { viewer: Viewer; notice?: string; errorText?: string } = $props();
</script>

{#if notice}
	<p class="mb-4 rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm" role="status">
		{notice}
	</p>
{/if}
{#if errorText}
	<p
		class="mb-4 rounded-lg border border-[var(--color-danger)] px-4 py-3 text-sm text-[var(--color-danger)]"
		role="alert"
	>
		{errorText}
	</p>
{/if}
{#if viewer.mutedUntil}
	<p class="mb-4 rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm" role="note">
		You're muted {viewer.mutedUntil}. You can still read, report and block.
	</p>
{:else if viewer.needsUsername}
	<p class="mb-4 rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm" role="note">
		Pick a username in <a class="underline" href="/settings/profile">Edit Profile</a> to post.
	</p>
{:else if viewer.needsSetup}
	<p class="mb-4 rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm" role="note">
		<a class="underline" href="/boards/guidelines">Read the community guidelines</a> to start posting.
	</p>
{/if}
