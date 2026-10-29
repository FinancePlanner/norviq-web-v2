<script lang="ts">
	// Port of norviq-web internal/pages/friends/friends.templ Page.
	import { Field, EmptyStateInline, FormErrorBanner, ListSkeleton, SecondarySubmitButton, SubmitButton, ToastBanner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import InviteButton from '#lib/features/social/friends/InviteButton.svelte';
	import SectionTabs from '#lib/features/social/friends/SectionTabs.svelte';
	import UserRow from '#lib/features/social/friends/UserRow.svelte';
	import SearchResults from '#lib/features/social/friends/SearchResults.svelte';
	import { boostedForm, FETCH_HEADER } from '#lib/features/social/friends/client.js';
	import type { SearchVM } from '#lib/features/social/friends/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The debounced /friends/search partial (hx-trigger "input changed delay:300ms, search").
	// Writable deriveds: reset from the load on every navigation (SSR included).
	let query = $derived(data.query);
	let live = $derived.by((): SearchVM | null => {
		void data.query;
		return null;
	});
	let loading = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let lastSent = $derived(data.query);
	let seq = 0;

	const shown = $derived(live ?? data.search);

	async function runSearch(value: string) {
		if (value === lastSent) return;
		lastSent = value;
		const id = ++seq;
		loading = true;
		try {
			const res = await fetch('/friends/search?' + new URLSearchParams({ q: value }), {
				headers: { accept: 'application/json', [FETCH_HEADER]: '1' }
			});
			const body = (await res.json()) as SearchVM;
			if (id === seq) live = body;
		} catch {
			if (id === seq) live = { query: value, users: [], errorMessage: t('Search is unavailable right now.') };
		} finally {
			if (id === seq) loading = false;
		}
	}

	function oninput() {
		clearTimeout(timer);
		timer = setTimeout(() => runSearch(query), 300);
	}

</script>

<svelte:head>
	<title>Friends - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page friends-page">
	<vigil.ModernPageHeader
		title={t('Friends')}
		subtitle={t('Compare progress with people you trust. Only percentages are ever shared, never amounts.')}
	>
		{#snippet actions()}<InviteButton />{/snippet}
	</vigil.ModernPageHeader>
	<SectionTabs activePath="/friends" />
	<ToastBanner message={data.notice ? t(data.notice) : ''} />
	<FormErrorBanner message={data.errorMessage} />
	<vigil.Panel class="mt-4" titleID="friend-search-title">
		<vigil.PanelHeader id="friend-search-title" title={t('Add friend')} desc={t('Find people by username')} />
		<form method="get" action="/friends" role="search" class="mt-3">
			<Field
				id="friend-search"
				name="q"
				label={t('Username')}
				type="search"
				bind:value={query}
				placeholder="@username"
				autocomplete="off"
				spellcheck="false"
				{oninput}
			/>
		</form>
		<div id="friend-search-loading" class={['skeleton-indicator mt-3', loading && 'htmx-request']}>
			<ListSkeleton rows={2} />
		</div>
		<div id="friend-search-results" class="mt-3" aria-live="polite">
			{#if shown}
				<SearchResults vm={shown} />
			{/if}
		</div>
		{#if data.xImport}
			<form method="post" action="/friends/x/start" class="mt-4">
				<SecondarySubmitButton class="w-auto px-4">{t('Find people you follow on X')}</SecondarySubmitButton>
			</form>
		{/if}
		{#if data.facebookImport}
			<form method="post" action="/friends/facebook/start" class="mt-4">
				<SecondarySubmitButton class="w-auto px-4">{t('Find friends from Facebook')}</SecondarySubmitButton>
			</form>
		{/if}
	</vigil.Panel>
	{#if data.requests.incoming.length > 0}
		<vigil.Panel class="mt-6" titleID="friend-requests-title">
			<vigil.PanelHeader id="friend-requests-title" title={t('Requests')} />
			<vigil.InsetList class="friend-requests-list">
				{#each data.requests.incoming as request (request.id)}
					<UserRow user={request.from}>
						{#snippet trailing()}
							<form method="post" action={'/friends/requests/' + request.id + '/accept'} {@attach boostedForm()}>
								<SubmitButton class="w-auto px-3">{t('Accept')}</SubmitButton>
							</form>
							<form method="post" action={'/friends/requests/' + request.id + '/decline'} {@attach boostedForm()}>
								<SecondarySubmitButton class="w-auto px-3">{t('Decline')}</SecondarySubmitButton>
							</form>
						{/snippet}
					</UserRow>
				{/each}
			</vigil.InsetList>
		</vigil.Panel>
	{/if}
	<vigil.Panel class="mt-6" titleID="friends-list-title">
		<vigil.PanelHeader id="friends-list-title" title={t('Friends')} />
		{#if data.friends.length === 0}
			<EmptyStateInline
				title={t('No friends yet')}
				description={t('No friends yet. Invite someone to compare progress and share ideas.')}
				actionLabel={t('Invite friends')}
				actionHref="/friends/invite"
			/>
		{:else}
			<vigil.InsetList class="friends-list">
				{#each data.friends as friend (friend.id)}
					<UserRow user={friend}>
						{#snippet trailing()}
							<a class="link-tint text-subhead font-semibold" href={'/friends/u/' + friend.id}>{t('View')}</a>
						{/snippet}
					</UserRow>
				{/each}
			</vigil.InsetList>
		{/if}
	</vigil.Panel>
	{#if data.requests.outgoing.length > 0}
		<vigil.Panel class="mt-6" titleID="friend-sent-title">
			<vigil.PanelHeader id="friend-sent-title" title={t('Sent')} />
			<vigil.InsetList class="friend-sent-list">
				{#each data.requests.outgoing as request (request.id)}
					<UserRow user={request.to}>
						{#snippet trailing()}
							<form method="post" action={'/friends/requests/' + request.id + '/cancel'} {@attach boostedForm()}>
								<SecondarySubmitButton class="w-auto px-3">{t('Cancel')}</SecondarySubmitButton>
							</form>
						{/snippet}
					</UserRow>
				{/each}
			</vigil.InsetList>
		</vigil.Panel>
	{/if}
	<nav class="mt-6 flex flex-wrap gap-4 text-subhead" aria-label={t('Friend settings')}>
		<a href="/settings/friends-privacy" class="link-tint font-semibold">{t('Privacy')}</a>
		<a href="/settings/blocked" class="link-tint font-semibold">{t('Blocked people')}</a>
	</nav>
</div>
