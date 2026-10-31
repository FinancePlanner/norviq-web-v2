<script lang="ts">
	// /research (internal/pages/research/page.templ + memo.templ savedMemos).
	import { enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import Field from '#lib/components/norviq/Field.svelte';
	import TextareaField from '#lib/components/norviq/TextareaField.svelte';
	import VaultTextField from '#lib/components/norviq/VaultTextField.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import SecondarySubmitButton from '#lib/components/norviq/SecondarySubmitButton.svelte';
	import EmptyState from '#lib/components/norviq/EmptyState.svelte';
	import EmptyStateInline from '#lib/components/norviq/EmptyStateInline.svelte';
	import ToastBanner from '#lib/components/norviq/ToastBanner.svelte';
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import { withSpinner } from '#lib/components/norviq/index.js';
	import { postAndFollow } from '#lib/features/planning-tools/research/form-follow.js';

	let { data, form } = $props();
	const vm = $derived(data.vm);
	// Go: research.Feedback(vm) in #research-feedback; a failed submit swaps in its error only.
	const success = $derived(form?.error ? '' : vm.successMessage);
	const error = $derived(form?.error ?? vm.errorMessage);
</script>

<svelte:head>
	<title>Research - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-canvas-page research-page research-modern-page">
	<vigil.ModernPageHeader title="Research notes" />
	<div id="research-feedback">
		<ToastBanner message={success} />
		<FormErrorBanner message={error} />
	</div>
	<form method="get" action="/research" class="mt-4 flex flex-wrap gap-3">
		<Field
			name="symbol"
			value={vm.filterSymbol}
			placeholder="Filter symbol"
			class="min-w-[140px]"
			aria-label="Filter by symbol"
		/>
		<SecondarySubmitButton class="px-4">Filter</SecondarySubmitButton>
		{#if vm.filterSymbol}
			<a href="/research" class="btn-secondary px-4">Clear</a>
		{/if}
	</form>
	<div class="vigil-command-split mt-6">
		<div class="vigil-command-split-main">
			<section class="space-y-3" aria-label="Saved memos">
				<h2 class="font-semibold">Saved memos</h2>
				{#if vm.savedMemos.length === 0}
					<EmptyStateInline
						title="No saved memos"
						description="Ask Q for a DD on a holding, for example /dd GRAB, then save the memo."
						actionLabel="Ask Q"
						actionHref="/assistant"
					/>
				{/if}
				{#each vm.savedMemos as memo (memo.id)}
					<article class="glass-card dash-panel p-5">
						<p class="text-xs font-bold text-muted-foreground">{memo.symbol} · {memo.createdAt}</p>
						<h3 class="mt-1 font-semibold">
							<a href={'/research/memos/' + memo.id}>{memo.title}</a>
						</h3>
						<p class="mt-2 text-sm text-muted-foreground">{memo.verdict}</p>
					</article>
				{/each}
			</section>
			<h2 class="mt-6 font-semibold">Notes</h2>
			<div class="vigil-dense-list mt-3 space-y-4">
				{#if vm.notes.length === 0}
					<EmptyState
						title="No research notes yet"
						description="Capture thesis, risks, and catalysts for your holdings."
					/>
				{/if}
				{#each vm.notes as note (note.id)}
					<article class="glass-card dash-panel p-6">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="text-xs font-bold text-muted-foreground">{note.symbol}</p>
								<h2 class="mt-1 text-lg font-semibold">{note.title}</h2>
							</div>
							<form
								method="POST"
								action={'/research/' + note.id + '/delete'}
								onsubmit={postAndFollow}
							>
								<input type="hidden" name="id" value={note.id} />
								<SecondarySubmitButton class="px-3 py-1 text-xs text-[var(--color-danger)]"
									>Delete</SecondarySubmitButton
								>
							</form>
						</div>
						<p class="mt-4 text-sm leading-relaxed">{note.thesis}</p>
						{#if note.risks}
							<p class="mt-3 text-sm"><span class="font-semibold">Risks:</span> {note.risks}</p>
						{/if}
						{#if note.catalyst}
							<p class="mt-2 text-sm">
								<span class="font-semibold">Catalysts:</span>
								{note.catalyst}
							</p>
						{/if}
					</article>
				{/each}
			</div>
		</div>
		<vigil.CommandSplitAside>
			<vigil.Panel class="p-6">
				<form class="space-y-4" method="POST" action="/research" use:enhance={withSpinner()}>
					<h2 class="font-semibold">New note</h2>
					<VaultTextField
						label="Symbol"
						name="symbol"
						inputType="text"
						placeholder="AAPL"
						value={vm.filterSymbol}
						required
					/>
					<VaultTextField
						label="Title"
						name="title"
						inputType="text"
						placeholder="Optional title"
						value=""
					/>
					<TextareaField
						id="thesis"
						name="thesis"
						label="Thesis"
						placeholder="Investment thesis…"
						required
						class="min-h-28"
						wrapperClass="space-y-2"
					/>
					<TextareaField
						id="risks"
						name="risks"
						label="Risks"
						placeholder="Key risks…"
						class="min-h-20"
						wrapperClass="space-y-2"
					/>
					<TextareaField
						id="catalysts"
						name="catalysts"
						label="Catalysts"
						placeholder="Upcoming catalysts…"
						class="min-h-20"
						wrapperClass="space-y-2"
					/>
					<SubmitButton class="w-auto px-6">Save note</SubmitButton>
				</form>
			</vigil.Panel>
		</vigil.CommandSplitAside>
	</div>
</div>
