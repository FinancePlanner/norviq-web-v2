<script lang="ts">
	// Port of settings.TelegramCard (telegram.templ): a three-way switch between
	// a freshly minted code, an established connection, or the invitation to
	// start one. A deployment with no bot configured renders nothing at all.
	import { enhance } from '$app/forms';
	import { CardHeader, CheckboxField, FormErrorBanner, MCPStateBadge, NativeButton, VigIcon, withSpinner } from '#lib/components/norviq/index.js';
	import { TELEGRAM_PRIVACY_WARNING, telegramToggleValue, type TelegramVM } from './types.js';

	let { vm }: { vm: TelegramVM } = $props();
</script>

{#snippet howTo()}
	<ol class="settings-telegram-steps mt-2 space-y-1 text-xs text-muted-foreground">
		<li>1 · Open the bot in Telegram.</li>
		<li>2 · Send it the 8-character code.</li>
		<li>3 · Ask it anything you would ask Norviq here.</li>
	</ol>
{/snippet}

{#if vm.available}
	<section class="glass-card settings-telegram mt-6 p-6">
		<div class="settings-telegram-identity">
			<VigIcon class="settings-telegram-vig" />
			<div>
				<CardHeader
					title="Telegram"
					desc="Ask Q from Telegram — the same assistant, the same conversation you see here. Proposed changes still wait for you to confirm them."
				/>
			</div>
		</div>
		{#if vm.loadError}
			<div class="mt-4">
				<FormErrorBanner message="Couldn't load your Telegram connection. Try again shortly." />
			</div>
		{:else if vm.code !== ''}
			<!-- Shown once: a reload mints nothing and falls through to the start card. -->
			<div class="mt-5 space-y-4">
				<p class="font-medium">Send this code to the bot to finish connecting.</p>
				<p class="settings-telegram-code font-mono text-2xl">{vm.code}</p>
				<p class="text-xs text-muted-foreground">
					Valid for {vm.codeExpiresIn}. Shown once &mdash; generate a new one if you lose it.
				</p>
				<div class="flex flex-wrap items-center gap-3">
					<a href={vm.deepLink} target="_blank" rel="noopener noreferrer" class="btn-primary px-5 py-2"> Open Telegram </a>
					<span class="text-xs text-muted-foreground">or message {'@' + vm.botUsername} yourself</span>
				</div>
				{@render howTo()}
			</div>
		{:else if vm.connected}
			<div class="mt-5 space-y-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p class="font-medium">Connected to @{vm.botUsername}</p>
						{#if vm.lastSeenAt !== ''}
							<p class="text-xs text-muted-foreground">Last message · {vm.lastSeenAt}</p>
						{:else}
							<p class="text-xs text-muted-foreground">Connected {vm.connectedAt} · no messages yet</p>
						{/if}
					</div>
					<MCPStateBadge state="live">Live</MCPStateBadge>
				</div>
				<p class="text-xs text-muted-foreground">{TELEGRAM_PRIVACY_WARNING}</p>
				{#if vm.alerts.length > 0}
					<!-- Everything defaults to off: a new alert kind must never start messaging someone who did not ask for it. -->
					<div class="mt-2">
						<p class="command-metric-label">Alerts to Telegram</p>
						<ul class="mcp-status-list mt-2">
							{#each vm.alerts as alert (alert.kind)}
								<li>
									<span class="mcp-scope">{alert.label}</span>
									<span class="flex items-center gap-3">
										{#if alert.quietHours !== ''}
											<span class="text-xs text-muted-foreground">quiet {alert.quietHours}</span>
										{/if}
										<form method="POST" action="?/telegramAlerts" use:enhance={withSpinner()}>
											<input type="hidden" name="kind" value={alert.kind} />
											<input type="hidden" name="enabled" value={telegramToggleValue(alert.enabled)} />
											<NativeButton type="submit" class="btn-ghost px-3 py-1 text-xs">
												{#if alert.enabled}Turn off{:else}Turn on{/if}
											</NativeButton>
										</form>
									</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				<form method="POST" action="?/telegramDisconnect" use:enhance={withSpinner()}>
					<NativeButton type="submit" class="btn-secondary px-5">Disconnect</NativeButton>
				</form>
			</div>
		{:else}
			<!-- An explicit acknowledgement is required before a link code is minted; the action refuses the post without it. -->
			<div class="mt-5 space-y-4">
				<div class="settings-telegram-warning rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm" role="note">
					<p class="font-medium">Before you connect</p>
					<p class="mt-1 text-muted-foreground">
						{TELEGRAM_PRIVACY_WARNING}
						<a href="/privacy#telegram" class="underline" target="_blank" rel="noopener">Privacy policy</a>
					</p>
				</div>
				<form method="POST" action="?/telegramConnect" class="space-y-4" use:enhance={withSpinner()}>
					<CheckboxField
						id="telegram-acknowledge-unencrypted"
						name="acknowledge_unencrypted"
						value="1"
						label="I understand that Telegram is not end-to-end encrypted and that my financial data will be stored on Telegram's servers."
						wrapperClass="items-start text-sm"
						required
					/>
					<NativeButton type="submit" class="btn-primary px-5">Connect Telegram</NativeButton>
				</form>
				{@render howTo()}
			</div>
		{/if}
	</section>
{/if}
