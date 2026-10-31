<script lang="ts">
	// xp.templ XPCardShell + XPCard: the dashboard card. Renders the placeholder,
	// then loads GET /xp/card after the page (Go: hx-get on load) so the XP and
	// streak fetches never hold up first paint. Render it only while
	// leaderboards are on (social.LeaderboardsEnabled).
	import { onMount } from 'svelte';
	import Flame from '@lucide/svelte/icons/flame';
	import { SkeletonBlock } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import CheckInControl from './CheckInControl.svelte';
	import { FETCH_HEADER, rememberTimezone } from './client.js';
	import { checkedInToday, count, progressPercent, progressValue, type XPCardVM } from './types.js';

	let vm = $state<XPCardVM | null>(null);

	onMount(() => {
		rememberTimezone();
		const ctrl = new AbortController();
		fetch('/xp/card', {
			headers: { accept: 'application/json', [FETCH_HEADER]: '1' },
			signal: ctrl.signal
		})
			.then(async (res) => {
				const body = (await res.json().catch(() => null)) as XPCardVM | null;
				vm =
					body && 'today' in body ? body : { xp: null, streaks: null, today: '', errorMessage: '' };
			})
			.catch((err: unknown) => {
				if ((err as Error)?.name !== 'AbortError')
					vm = { xp: null, streaks: null, today: '', errorMessage: '' };
			});
		return () => ctrl.abort();
	});
</script>

<div id="xp-card">
	{#if !vm}
		<vigil.Panel class="xp-card">
			<div class="cc-panel-head">
				<div class="cc-panel-head-copy">
					<h2 class="cc-panel-title">{t('Your progress')}</h2>
				</div>
			</div>
			<SkeletonBlock heightClass="h-24" />
		</vigil.Panel>
	{:else}
		<vigil.Panel class="xp-card" titleID="xp-card-title">
			<vigil.PanelHeader id="xp-card-title" title={t('Your progress')}>
				{#snippet trailing()}
					<a class="link-tint text-subhead font-semibold" href="/xp">{t('History')}</a>
				{/snippet}
			</vigil.PanelHeader>
			{#if vm.errorMessage || !vm.xp}
				<p class="mt-2 text-subhead text-muted-foreground">
					{vm.errorMessage || t('Could not load your XP right now.')}
				</p>
			{:else}
				<div class="mt-2 flex items-baseline justify-between gap-3">
					<span class="text-title3 font-semibold">{t('Level')} {vm.xp.level}</span>
					<span class="text-subhead text-muted-foreground tabular-nums">{vm.xp.total} XP</span>
				</div>
				<div
					class="settings-badge-track mt-3"
					role="progressbar"
					aria-label={t('Progress to the next level')}
					aria-valuemin="0"
					aria-valuemax="100"
					aria-valuenow={Number(progressValue(vm.xp.levelProgress))}
				>
					<div
						class="settings-badge-fill"
						style={'width: ' + progressPercent(vm.xp.levelProgress)}
					></div>
				</div>
				<div class="mt-4 grid grid-cols-2 gap-4">
					<div class="command-metric">
						<span class="command-metric-label">{t('This week')}</span>
						<span class="command-metric-value">+{vm.xp.weekXP} XP</span>
					</div>
					{#if vm.streaks}
						<div class="command-metric">
							<span class="command-metric-label">{t('Check-in streak')}</span>
							<span class="command-metric-value">
								<Flame class="mr-1 inline h-4 w-4 align-[-2px]" />
								{count(vm.streaks.checkInCurrent, 'day', 'days')}
							</span>
						</div>
					{/if}
				</div>
				<div class="mt-4" id="xp-check-in">
					<CheckInControl alreadyToday={checkedInToday(vm)} />
				</div>
			{/if}
		</vigil.Panel>
	{/if}
</div>
