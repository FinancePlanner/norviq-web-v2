<script lang="ts">
	// feed.templ CongratsButton: a row's cheer control. Once cheered (or when the
	// viewer already had) it is a pressed, inert button with no form, so the
	// count cannot climb twice. Without JS the form posts and redirects back.
	import { SecondaryButton, SecondarySubmitButton } from '#lib/components/norviq/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import { postForm } from './client.js';
	import type { CongratsVM } from './types.js';

	let { vm: initial }: { vm: CongratsVM } = $props();

	let posted = $state<CongratsVM | null>(null);
	let busy = $state(false);
	const vm = $derived(posted ?? initial);

	async function onsubmit(e: SubmitEvent) {
		e.preventDefault();
		if (busy) return;
		const form = e.currentTarget as HTMLFormElement;
		busy = true;
		form.classList.add('htmx-request');
		try {
			const res = await postForm(form);
			const body = (await res.json().catch(() => null)) as CongratsVM | null;
			posted = body && body.id ? body : { ...vm, errorMessage: t('Could not send your cheer.') };
		} catch {
			posted = { ...vm, errorMessage: t('Could not send your cheer.') };
		} finally {
			busy = false;
			form.classList.remove('htmx-request');
		}
	}
</script>

<div id={'congrats-' + vm.id} class="flex shrink-0 flex-col items-end gap-1">
	{#if vm.gone}
		<span class="text-subhead text-muted-foreground">{t('No longer available')}</span>
	{:else if vm.done}
		<SecondaryButton class="w-auto px-3" disabled aria-pressed="true" aria-label={t('Congratulated')}>
			<span aria-hidden="true">🎉</span>
			<span>{vm.count}</span>
		</SecondaryButton>
	{:else}
		<form method="post" action={'/friends/feed/' + vm.id + '/congrats'} {onsubmit}>
			<input type="hidden" name="count" value={String(vm.count)} />
			<SecondarySubmitButton class="w-auto px-3" disabled={busy} aria-pressed="false" aria-label={t('Congratulate')}>
				<span aria-hidden="true">🎉</span>
				<span>{vm.count}</span>
			</SecondarySubmitButton>
		</form>
		{#if vm.errorMessage}
			<span class="text-subhead text-danger" role="alert">{vm.errorMessage}</span>
		{/if}
	{/if}
</div>
