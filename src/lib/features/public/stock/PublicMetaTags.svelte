<script lang="ts">
	// public.MetaTags (stock.templ) and public.PortfolioShareMetaTags
	// (portfolio_share.templ): the same tag set, differing only in robots.
	// Rendered inside the page's <svelte:head>.
	let {
		title,
		description,
		canonicalURL,
		ogImageURL,
		robots
	}: {
		title: string;
		description: string;
		canonicalURL: string;
		ogImageURL: string;
		robots: string;
	} = $props();
</script>

<meta name="description" content={description} />
<meta name="robots" content={robots} />
<link rel="canonical" href={canonicalURL} />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Norviq" />
<meta property="og:locale" content="en_US" />
<meta property="og:url" content={canonicalURL} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={ogImageURL} />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@NorviqPlanner" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImageURL} />
