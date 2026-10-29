<script lang="ts">
	// xp.templ CheckInControl / CheckInError: the button before a check-in and
	// the result after one. Swaps itself in place, like the hx-post into
	// #xp-check-in; without JS POST /xp/check-in redirects to /xp.
	import Check from '@lucide/svelte/icons/check';
	import { SubmitButton } from '#lib/components/norviq/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import { postForm } from './client.js';
	import { count, type CheckInResponse } from './types.js';

	let { alreadyToday }: { alreadyToday: boolean } = $props();

	let result = $state<CheckInResponse | null>(null);
	let errorMessage = $state('');

	async function onsubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		if (form.classList.contains('htmx-request')) return;
		form.classList.add('htmx-request');
		try {
			const res = await postForm(form);
			const body = (await res.json().catch(() => null)) as { result?: CheckInResponse; error?: string } | null;
			if (body?.result) result = body.result;
			else errorMessage = body?.error || t('Could not check in. Try again.');
		} catch {
			errorMessage = t('Could not check in. Try again.');
		} finally {
			form.classList.remove('htmx-request');
		}
	}
</script>

{#if errorMessage}
	<p class="text-subhead text-danger" role="alert">{errorMessage}</p>
{:else if result}
	<p class="text-subhead font-semibold" role="status">
		{#if result.alreadyCheckedIn}
			{t('Already checked in today')}
		{:else}
			{'+' + result.xpAwarded + ' XP · ' + count(result.streak, 'day', 'days')}
		{/if}
	</p>
{:else if alreadyToday}
	<p class="text-subhead text-muted-foreground">
		<Check class="mr-1 inline h-4 w-4 align-[-2px]" />
		{t('Checked in')}
	</p>
{:else}
	<form method="post" action="/xp/check-in" {onsubmit}>
		<SubmitButton class="w-auto px-4">{t('Check in')}</SubmitButton>
	</form>
{/if}
