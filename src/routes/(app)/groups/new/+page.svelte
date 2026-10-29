<script lang="ts">
	// groups.templ NewGroupPage: topic, ticker, name, emoji, description,
	// visibility. Private is the default.
	import { Field, NativeInput, SubmitButton, TextareaField } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import GroupsMeta from '#lib/features/social/groups/GroupsMeta.svelte';
	import Notices from '#lib/features/social/groups/Notices.svelte';
	import { formTopic, topics } from '#lib/features/social/groups/view.js';
	import type { PageProps } from './$types';

	let { data, form: result }: PageProps = $props();

	// After a refusal the action re-renders the page with the posted values.
	const vm = $derived(result ?? data);
	let topic = $derived(formTopic(vm.form.topic));
</script>

<GroupsMeta title="New group - Norviq" />
<div class="app-page-content vigil-document-page groups-new-page">
	<vigil.ModernPageHeader title="New group" subtitle="It starts with #general. You can add channels and invite friends next." />
	<Notices error={vm.error} />
	<form method="post" action="/groups/new" class="glass-card dash-panel space-y-5 p-5">
		<fieldset>
			<legend class="field-label">What's it about?</legend>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each topics as option (option.value)}
					<label class="groups-topic-chip">
						<input type="radio" name="topic" value={option.value} class="sr-only" bind:group={topic} />
						<span>{option.label}</span>
					</label>
				{/each}
			</div>
		</fieldset>
		<div hidden={!['stock', 'etf', 'crypto'].includes(topic)}>
			<Field
				name="ticker"
				label="Ticker"
				value={vm.form.ticker}
				placeholder="AAPL"
				description="The symbol this group is about. It shows as a chip and lets people find the group."
			/>
		</div>
		<Field name="name" label="Name" value={vm.form.name} required placeholder="AAPL holders" />
		<Field name="emoji" label="Icon" value={vm.form.emoji} placeholder="🍎" description="One emoji. Leave it empty to use the first letter." />
		<TextareaField name="description" label="What it's for" value={vm.form.description} rows={3} />
		<fieldset>
			<legend class="field-label">Who can join</legend>
			<div class="mt-2 space-y-2">
				<label class="flex items-start gap-3">
					<NativeInput name="visibility" type="radio" value="private" checked={vm.form.visibility !== 'public'} />
					<span><span class="font-medium">Private</span><span class="block text-sm text-muted-foreground">Only people you invite.</span></span>
				</label>
				{#if vm.publicAllowed}
					<label class="flex items-start gap-3">
						<NativeInput name="visibility" type="radio" value="public" checked={vm.form.visibility === 'public'} />
						<span><span class="font-medium">Public</span><span class="block text-sm text-muted-foreground">Anyone can find it in Discover and join.</span></span>
					</label>
				{/if}
			</div>
		</fieldset>
		<SubmitButton fullWidth>Create group</SubmitButton>
	</form>
</div>
