<script lang="ts">
	// guidedstart.StepLayer + guided-start.js (guidedSpotlight). Rings the
	// control the step teaches ([data-guide=target]) and dims the rest with the
	// ring's own shadow. Not modal: the ring takes no pointer events. With no
	// target on the page there is no ring and no dim, only the bubble.
	//
	// The htmx poller (hx-get /guided-start/poll, load delay 1/2/4/8/10s) is a
	// timer loop on the JSON endpoint; Skip posts /guided-start/skip.
	import { onMount, tick, untrack } from 'svelte';
	import { capture } from '#lib/analytics/index.js';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import { SKIP_LABEL, pollDelayMs, stepLine, stepTarget, type LayerVM, type OutcomeVM, type PollResult } from './guide.js';

	let { layer }: { layer: LayerVM } = $props();

	const MODAL_SELECTOR = 'dialog[open], [role="dialog"], [aria-modal="true"]';
	const target = untrack(() => stepTarget(layer.step));
	const announce = untrack(() => layer.announce);

	let phase = $state<'open' | 'finished' | 'gone'>('open');
	let found = $state(false);
	let ringStyle = $state('');
	let dismissed = false;
	let boundTarget: Element | null = null;
	let root = $state<HTMLDivElement | null>(null);
	let bubble = $state<HTMLDivElement | null>(null);

	const outcomeProps = (o: OutcomeVM, withElsewhere: boolean) =>
		withElsewhere
			? { step: o.step, elapsed_ms: o.elapsedMs, completed_elsewhere: o.elsewhere }
			: { step: o.step, elapsed_ms: o.elapsedMs };

	function isVisible(el: Element): boolean {
		if (el instanceof HTMLDialogElement) return el.open;
		if (el.hasAttribute('hidden')) return false;
		const style = window.getComputedStyle(el);
		return style.display !== 'none' && style.visibility !== 'hidden';
	}

	// Escape belongs to an open dialog (e.g. the add-holding modal the target
	// opened), not to the guided step.
	function modalIsOpen(event: KeyboardEvent): boolean {
		if (event.defaultPrevented) return true;
		if (event.target instanceof Element && event.target.closest(MODAL_SELECTOR)) return true;
		for (const dialog of document.querySelectorAll(MODAL_SELECTOR)) {
			if (root?.contains(dialog)) continue;
			if (isVisible(dialog)) return true;
		}
		return false;
	}

	const targetElement = () => document.querySelector(`[data-guide="${target}"]`);

	function onTargetClick() {
		// Acting on the target ends the ring and dim, not the step.
		dismissed = true;
		found = false;
	}

	function locate() {
		const el = targetElement();
		if (boundTarget !== el) {
			boundTarget?.removeEventListener('click', onTargetClick);
			el?.addEventListener('click', onTargetClick, { once: true });
			boundTarget = el;
		}
		if (dismissed) {
			found = false;
			return;
		}
		const rect = el?.getBoundingClientRect();
		if (!rect || rect.width === 0 || rect.height === 0) {
			found = false;
			return;
		}
		const pad = 8;
		found = true;
		ringStyle = `top:${rect.top - pad}px;left:${rect.left - pad}px;width:${rect.width + pad * 2}px;height:${rect.height + pad * 2}px`;
	}

	function end(result: PollResult) {
		if (result.state === 'done') {
			capture('guided_start_step_completed', outcomeProps(result.outcome, true));
			phase = 'finished';
		} else if (result.state === 'ended') {
			capture(result.event, outcomeProps(result.outcome, false));
			phase = 'gone';
		}
	}

	let pollTimer: ReturnType<typeof setTimeout> | undefined;
	function schedulePoll(attempt: number) {
		pollTimer = setTimeout(async () => {
			if (phase !== 'open') return;
			let result: PollResult;
			try {
				const res = await fetch(`/guided-start/poll?attempt=${attempt}`, { headers: { Accept: 'application/json' } });
				result = (await res.json()) as PollResult;
			} catch {
				result = { state: 'pending' };
			}
			if (phase !== 'open') return;
			if (result.state === 'pending') schedulePoll(attempt + 1);
			else end(result); // 'none': the poller swaps itself out and stops
		}, pollDelayMs(attempt));
	}

	async function skip() {
		try {
			const res = await fetch('/guided-start/skip', { method: 'POST', headers: { Accept: 'application/json' } });
			end((await res.json()) as PollResult);
		} catch {
			/* hx-swap="none": nothing to show on failure */
		}
	}

	onMount(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== 'Escape' || phase !== 'open') return;
			if (modalIsOpen(event)) return;
			void skip();
		};
		window.addEventListener('resize', locate);
		window.addEventListener('scroll', locate, { passive: true });
		document.addEventListener('keydown', onKey);
		// Content that renders later (lists loading, dialogs closing) can move the target.
		const observer = new MutationObserver(() => locate());
		observer.observe(document.body, { childList: true, subtree: true });

		const el = targetElement();
		if (el) {
			const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
		}
		locate();
		if (announce) {
			const source = layer.source === 'settings' ? 'settings' : 'auto';
			capture('guided_start_step_started', { step: layer.step, source });
			void tick().then(() => bubble?.focus({ preventScroll: true }));
		}
		schedulePoll(0);

		return () => {
			clearTimeout(pollTimer);
			observer.disconnect();
			window.removeEventListener('resize', locate);
			window.removeEventListener('scroll', locate);
			document.removeEventListener('keydown', onKey);
			boundTarget?.removeEventListener('click', onTargetClick);
		};
	});
</script>

{#if phase === 'open'}
	<div id="guided-step-layer" class="guided-step-layer" bind:this={root}>
		{#if found}
			<div class="guided-step-ring" style={ringStyle} aria-hidden="true"></div>
		{/if}
		<div class="guided-step-bubble" role="status" aria-live="polite" tabindex="-1" bind:this={bubble}>
			<p class="text-sm font-semibold">{stepLine(layer.step)}</p>
			<div class="mt-3 flex items-center justify-end">
				<NativeButton class="dash-btn dash-btn-secondary" onclick={skip}>{SKIP_LABEL}</NativeButton>
			</div>
			<div class="guided-step-poller" aria-hidden="true"></div>
		</div>
	</div>
{:else if phase === 'finished'}
	<div id="guided-step-layer" class="guided-step-layer is-finished">
		<div class="guided-step-bubble" role="status" aria-live="polite">
			<p class="text-sm font-semibold">Done.</p>
			<a href="/dashboard" class="link-tint text-subhead font-semibold">Back to Get started</a>
		</div>
	</div>
{/if}
