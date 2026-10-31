<script lang="ts">
	// legal.MetaTags + legal.Page + sectionTable (internal/pages/legal/legal.templ),
	// rendered by LegalHandler.render inside the public layout.
	import { absolute, hasHeaders, metaDescription, type Document } from './legal.js';
	import { OperatorEmail } from './operator.js';

	let { doc, publicBase, path }: { doc: Document; publicBase: string; path: string } = $props();

	const canonical = $derived(absolute(publicBase, path));
	const description = $derived(metaDescription(doc));
	const ogImage = $derived(absolute(publicBase, '/static/images/og.png'));
</script>

<svelte:head>
	<title>{'Norviq — ' + doc.title}</title>
	<meta name="description" content={description} />
	<meta name="robots" content="index,follow,max-image-preview:large" />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Norviq" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content={'Norviq — ' + doc.title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@NorviqPlanner" />
	<meta name="twitter:title" content={'Norviq — ' + doc.title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>

<main
	id="main-content"
	class="legal-page legal-modern-page legal-prose mx-auto w-full max-w-3xl px-6 py-16"
>
	<a href="/" class="text-sm text-muted-foreground hover:opacity-100">← Back to Norviq</a>
	<h1 class="mt-4 text-3xl font-semibold tracking-tight">{doc.title}</h1>
	{#if doc.lastUpdated}
		<p class="mt-2 text-sm text-muted-foreground">Last updated {doc.lastUpdated}</p>
	{/if}
	{#if doc.intro}
		<p class="mt-6 leading-relaxed opacity-90">{doc.intro}</p>
	{/if}
	{#each doc.sections as section, i (i)}
		<section class="mt-8 scroll-mt-20" id={section.id || undefined}>
			<h2 class="text-xl font-semibold">
				{#if section.id}
					<a href={'#' + section.id} class="hover:underline">{section.heading}</a>
				{:else}
					{section.heading}
				{/if}
			</h2>
			{#each section.body ?? [] as paragraph, j (j)}
				<p class="mt-3 leading-relaxed opacity-90">{paragraph}</p>
			{/each}
			{#if section.table}
				{@const table = section.table}
				<div class="mt-4 overflow-x-auto">
					<table class="w-full border-collapse text-left text-sm">
						{#if table.caption}
							<caption class="mb-2 text-left text-xs text-muted-foreground">{table.caption}</caption
							>
						{/if}
						{#if hasHeaders(table.headers)}
							<thead>
								<tr>
									{#each table.headers ?? [] as header, j (j)}
										<th scope="col" class="border-b px-2 py-2 font-semibold">{header}</th>
									{/each}
								</tr>
							</thead>
						{/if}
						<tbody>
							{#each table.rows ?? [] as row, j (j)}
								<tr>
									{#each row as cell, k (k)}
										<td class="border-b px-2 py-2 align-top opacity-90">{cell}</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
			{#if section.links && section.links.length > 0}
				<ul class="mt-3 list-disc space-y-1 pl-5">
					{#each section.links as link, j (j)}
						<li><a href={link.href} class="underline">{link.label}</a></li>
					{/each}
				</ul>
			{/if}
		</section>
	{/each}
	<footer class="mt-16 border-t pt-6 text-sm text-muted-foreground">
		<p>
			Questions? Contact <a href={'mailto:' + OperatorEmail} class="underline">{OperatorEmail}</a>.
		</p>
		<p class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
			<a href="/privacy" class="underline">Privacy Policy</a>
			<a href="/terms" class="underline">Terms of Use</a>
			<a href="/legal" class="underline">Legal notice</a>
			<a href="/security" class="underline">Security</a>
		</p>
	</footer>
</main>
