<script lang="ts">
	// stock.EarningsTranscriptPanel + the earningsAudioPlayer Alpine component
	// (assets/scripts.js): speechSynthesis read-aloud of the transcript.
	import { NativeButton, SecondaryButton } from '#lib/components/norviq/index.js';
	import { closeDialog } from '#lib/components/norviq/tui/dialog/index.js';
	import type { TranscriptViewModel } from '../detail.js';

	let { vm }: { vm: TranscriptViewModel | null } = $props();

	let supported = $state(false);
	let playing = $state(false);
	let paused = $state(false);
	let status = $state('');
	let textEl = $state<HTMLElement | null>(null);

	$effect(() => {
		supported =
			typeof window !== 'undefined' &&
			'speechSynthesis' in window &&
			'SpeechSynthesisUtterance' in window;
		if (!supported) status = 'Audio playback is not supported in this browser.';
		return () => stop();
	});

	// A new transcript swapped in: Alpine re-initialised the component.
	$effect(() => {
		void vm;
		return () => stop();
	});

	function reset() {
		playing = false;
		paused = false;
		if (supported) status = '';
	}

	function play() {
		const text = textEl?.textContent?.trim() || '';
		if (!text) return;
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.rate = 0.96;
		utterance.pitch = 1;
		utterance.onstart = () => {
			playing = true;
			paused = false;
			status = 'Playing';
		};
		utterance.onend = () => reset();
		utterance.onerror = () => {
			reset();
			status = 'Audio playback stopped.';
		};
		window.speechSynthesis.speak(utterance);
	}

	function toggle() {
		if (!supported) return;
		if (playing && !paused) {
			window.speechSynthesis.pause();
			paused = true;
			status = 'Paused';
			return;
		}
		if (playing && paused) {
			window.speechSynthesis.resume();
			paused = false;
			status = 'Playing';
			return;
		}
		play();
	}

	function stop() {
		if (!supported) return;
		window.speechSynthesis.cancel();
		reset();
	}

	const buttonLabel = $derived(
		playing && !paused ? 'Pause audio' : playing && paused ? 'Resume audio' : 'Listen'
	);
</script>

<div id="earnings-transcript-panel">
	{#if vm}
		<div class="portfolio-form-header">
			<h2 id="earnings-transcript-title" class="text-xl font-semibold">
				{#if vm.quarter !== ''}{vm.symbol} · {vm.quarter}{:else}{vm.symbol} transcript{/if}
			</h2>
			<NativeButton
				class="portfolio-form-close"
				aria-label="Close"
				onclick={() => {
					stop();
					closeDialog('transcript-dialog');
				}}
			>
				<span aria-hidden="true">×</span>
			</NativeButton>
		</div>
		{#if vm.error !== ''}
			<p class="mt-6 text-sm text-muted-foreground" role="alert">{vm.error}</p>
		{:else}
			<div class="mt-6 flex flex-wrap items-center gap-3">
				{#if supported}
					<SecondaryButton class="px-4 py-2 text-sm" onclick={toggle}>{buttonLabel}</SecondaryButton
					>
				{/if}
				{#if playing}
					<SecondaryButton class="px-4 py-2 text-sm" onclick={stop}>Stop</SecondaryButton>
				{/if}
				<p class="text-xs text-muted-foreground">{status}</p>
			</div>
			<div
				class="stock-transcript-body mt-6 text-sm leading-relaxed whitespace-pre-wrap opacity-90"
				bind:this={textEl}
			>
				{vm.content}
			</div>
		{/if}
	{/if}
</div>
