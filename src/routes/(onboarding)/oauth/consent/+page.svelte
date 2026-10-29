<script lang="ts">
	// oauth.ConsentPage. Deny / Authorize are plain form posts: the response is
	// a redirect to the MCP client's (possibly custom-scheme) redirect URI.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import AuthBrandPanel from '#lib/components/norviq/AuthBrandPanel.svelte';
	import BrandLogo from '#lib/components/norviq/BrandLogo.svelte';
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head>
	<title>Authorize access - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content oauth-consent auth-vigil mx-auto max-w-md">
	<vigil.AuthShell class="min-h-0">
		<vigil.AuthBrandColumn>
			<AuthBrandPanel />
		</vigil.AuthBrandColumn>
		<vigil.AuthFormColumn>
			<div class="auth-form-card glass-card space-y-5">
				<header class="auth-modern-header flex flex-col items-center text-center">
					<BrandLogo variant="icon" />
					<h1 class="auth-modern-title mt-4">Authorize access</h1>
					<p class="mt-2 text-subhead text-muted-foreground">
						<span class="font-semibold">{vm.clientName}</span> wants to access your Norviq account.
					</p>
				</header>
				{#if vm.errorMessage}
					<FormErrorBanner message={vm.errorMessage} />
				{/if}
				<div class="space-y-2">
					<p class="field-label">This will allow it to:</p>
					<ul class="space-y-1">
						{#each vm.scopeDescriptions as desc, i (i)}
							<li class="flex items-start gap-2">
								<span aria-hidden="true">✓</span>
								<span>{desc}</span>
							</li>
						{/each}
					</ul>
				</div>
				<div class="flex gap-3">
					<form method="POST" action="/oauth/consent/deny" class="flex-1">
						<input type="hidden" name="flow_id" value={vm.flowId} />
						<NativeButton type="submit" class="btn-secondary w-full">Deny</NativeButton>
					</form>
					<form method="POST" action="/oauth/consent/approve" class="flex-1">
						<input type="hidden" name="flow_id" value={vm.flowId} />
						<NativeButton type="submit" class="btn-primary w-full">Authorize</NativeButton>
					</form>
				</div>
			</div>
		</vigil.AuthFormColumn>
	</vigil.AuthShell>
</div>
