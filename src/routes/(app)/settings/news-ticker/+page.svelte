<script lang="ts">
	// settings.NewsTickerPage (internal/pages/settings/news_ticker.templ).
	import { enhance } from '$app/forms';
	import { Field, SubmitButton, SwitchField, withSpinner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const errorMessage = $derived(form?.errorMessage ?? data.errorMessage);
</script>

<svelte:head>
	<title>News ticker - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-news-ticker settings-modern-page">
	<vigil.SettingsShell
		backHref="/settings"
		backLabel={t('← Settings')}
		title={t('News ticker')}
		subtitle={t(
			"Breaking market headlines on your dashboard, from publishers' own feeds. Headlines only; links open the publisher."
		)}
	>
		<div id="news-ticker-feedback">
			{#if errorMessage}
				<p class="form-error" role="alert">{errorMessage}</p>
			{/if}
		</div>
		{#if !data.configured}
			<div
				class="rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm text-muted-foreground"
				role="note"
			>
				{t('The news ticker is not configured on this server.')}
			</div>
		{:else}
			<section class="glass-card mt-6 p-6">
				<!-- The switch posts on change (Go: hx-trigger="change"); an unchecked
				     box sends nothing, which the action reads as "off". -->
				<form
					method="POST"
					action="?/toggle"
					use:enhance={withSpinner()}
					onchange={(e) => e.currentTarget.requestSubmit()}
				>
					<SwitchField
						id="news-ticker-enabled"
						name="enabled"
						value="true"
						label={t('Show the ticker')}
						description={t(
							'Turn it off and the dashboard strip disappears everywhere you sign in.'
						)}
						checked={data.enabled}
					/>
				</form>
			</section>
			<section class="glass-card mt-6 p-6">
				<h2 class="text-lg leading-none font-semibold tracking-tight">{t('Your feeds')}</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					{t('Add a site or feed address. Norviq finds the feed behind it.')}
					{t('%d of %d used.', data.feeds.length, data.maxFeeds)}
				</p>
				{#if data.feeds.length > 0}
					<ul class="mt-4 space-y-2" role="list">
						{#each data.feeds as feed (feed.id)}
							<li class="flex items-center justify-between gap-3 text-sm">
								<div class="min-w-0">
									{#if feed.title !== ''}
										<p class="truncate font-medium">{feed.title}</p>
									{/if}
									<p class="truncate text-muted-foreground">{feed.url}</p>
								</div>
								<form method="POST" action="?/removeFeed" use:enhance={withSpinner()}>
									<input type="hidden" name="id" value={feed.id} />
									<SubmitButton class="btn-secondary w-auto px-3">{t('Remove')}</SubmitButton>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
				{#if data.feeds.length < data.maxFeeds}
					<form method="POST" action="?/addFeed" class="mt-4 space-y-3" use:enhance={withSpinner()}>
						<Field
							id="news-ticker-url"
							name="url"
							label={t('Site or feed URL')}
							type="url"
							placeholder="https://"
							autocomplete="off"
							required
							wrapperClass="space-y-2"
						/>
						<SubmitButton class="w-auto px-6">{t('Add')}</SubmitButton>
					</form>
				{/if}
			</section>
		{/if}
	</vigil.SettingsShell>
</div>
