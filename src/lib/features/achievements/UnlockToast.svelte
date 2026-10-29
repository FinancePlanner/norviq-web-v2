<script lang="ts">
	// Port of norviq-web internal/pages/achievements/toast.templ UnlockToast and
	// the shell's lazy `#achievement-toast` placeholder (hx-get
	// /achievements/unseen, hx-trigger load). Go re-rendered the shell on every
	// (boosted) page load, so it asked after every navigation; so does this.
	// The server marks what it returns as seen, so each unlock shows once.
	// Dismissal is client-side only.
	import { afterNavigate } from '$app/navigation';
	import { GhostButton, IconButton } from '#lib/components/norviq/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import { tierLabelID, type ToastViewModel } from './viewmodel.js';

	let toast = $state<ToastViewModel | null>(null);
	let seq = 0;

	afterNavigate(async (nav) => {
		// Hash-only moves are not page loads.
		if (nav.type === 'enter' || nav.from?.url.pathname !== nav.to?.url.pathname || nav.from?.url.search !== nav.to?.url.search) {
			const mine = ++seq;
			// The new page replaces the old shell, toast and all.
			toast = null;
			try {
				const res = await fetch('/achievements/unseen', { headers: { accept: 'application/json' } });
				if (!res.ok || mine !== seq) return;
				const body = (await res.json()) as { toast: ToastViewModel | null };
				toast = body.toast;
			} catch {
				// Like a failed hx-get: nothing renders.
			}
		}
	});
</script>

{#if toast}
	<div
		id="achievement-toast"
		data-achievement-toast
		class="achievement-toast success-banner flex items-center justify-between gap-3"
		role="status"
	>
		<span>
			{#if toast.count === 1}
				{t('Achievement unlocked')} · {toast.title}{#if toast.tier}{' (' + t(tierLabelID(toast.tier)) + ')'}{/if}
			{:else}
				{toast.count + ' ' + t('achievements unlocked')}
			{/if}
		</span>
		<span class="flex shrink-0 items-center gap-2">
			<GhostButton href="/achievements">{t('View')}</GhostButton>
			<IconButton aria-label={t('Dismiss')} onclick={() => (toast = null)}>
				<span aria-hidden="true">&times;</span>
			</IconButton>
		</span>
	</div>
{/if}
