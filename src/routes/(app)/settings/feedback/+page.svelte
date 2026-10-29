<script lang="ts">
	import { enhance } from '$app/forms';
	import { FormErrorBanner, SelectField, SubmitButton, TextareaField, ToastBanner, withSpinner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const topicOptions = $derived(data.topics.map((topic) => ({ value: topic, label: topic })));
</script>

<svelte:head>
	<title>Feedback - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-modern-page settings-section-page">
	<vigil.SettingsShell backHref="/settings" backLabel={t('← Settings')} title="Feedback">
		<!-- Go swapped only #feedback-result, so the fields keep what was typed. -->
		<form
			class="glass-card space-y-4 p-6"
			method="POST"
			use:enhance={withSpinner(() => async ({ update }) => update({ reset: false, invalidateAll: false }))}
		>
			<div id="feedback-result">
				{#if form?.success}
					<ToastBanner message={form.message} />
				{:else if form}
					<FormErrorBanner message={form.message} />
				{/if}
			</div>
			<div class="space-y-2">
				<label class="field-label" for="category">Category</label>
				<SelectField id="category" name="topic" required options={topicOptions} />
			</div>
			<div class="space-y-2">
				<label class="field-label" for="message">Message</label>
				<TextareaField id="message" name="message" placeholder="Tell us what you think…" required class="min-h-32" />
			</div>
			<SubmitButton class="w-auto px-6">Send feedback</SubmitButton>
		</form>
	</vigil.SettingsShell>
</div>
