<script lang="ts">
	// Port of norviq-web internal/pages/boards/boards.templ GuidelinesPage.
	import { enhance } from '$app/forms';
	import { SubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Community guidelines - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page boards-page">
	<vigil.ModernPageHeader title="Community guidelines" subtitle="Read these once before you post." />
	<article class="glass-card dash-panel max-w-2xl space-y-3 p-6 text-sm leading-relaxed">
		<p>Boards are for sharing ideas about money, markets and Norviq. By posting you agree to:</p>
		<ul class="list-disc space-y-1 pl-5">
			<li>No harassment, hate, threats or sexual content. Zero tolerance.</li>
			<li>No spam, scams, pump-and-dumps, referral farming or impersonation.</li>
			<li>Nothing here is financial advice. Say when you hold what you're talking about.</li>
			<li>Don't post other people's personal or account information.</li>
		</ul>
		<p>
			Report anything that breaks these. Reported posts are reviewed within 24 hours, and people who break the rules are muted or
			removed.
		</p>
		<form method="post" action="/boards/guidelines" class="pt-2" use:enhance={withSpinner()}>
			<input type="hidden" name="next" value={data.next} />
			<SubmitButton>I agree</SubmitButton>
		</form>
	</article>
</div>
