<script lang="ts">
	import LegalPage from '#lib/features/public/legal/LegalPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<LegalPage doc={data.doc} publicBase={data.publicBase} path={data.path} />
