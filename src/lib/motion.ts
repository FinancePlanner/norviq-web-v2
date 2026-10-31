// Port of norviq-web's NorviqMotion (internal/server/assets/scripts.js) and the
// scroll reveal (motion-reveal.js), as plain functions plus Svelte attachments.
//
// Every helper is a no-op (or jumps to the end state) under
// prefers-reduced-motion, exactly like the Go web.
//
// Svelte owns the text nodes it renders, so nothing here assigns
// el.textContent on an element with a single text child: setText() writes the
// text node's nodeValue instead, which Svelte's next update overwrites cleanly.
// Every count-up ends on the exact `to` string.
//
// Usage:
//   <div {@attach pageMotion()}>…page…</div>            initFirstPaintMotion, scoped
//   <ul {@attach staggerOnMount(':scope > li', 28)}>    staggerReveal on mount
//   <section data-motion-reveal {@attach reveal()}>      scroll reveal (.is-visible)
//   <p {@attach scrubText()}>words…</p>                  data-scrub-text word reveal
//   <span {@attach flashOnChange(() => value)}>{value}</span>  flash + count on change
//   <p class="nq-hero-value" {@attach countUp()}>{value}</p>   first-paint count-up
import { animate } from 'motion';
import type { Attachment } from 'svelte/attachments';

export function prefersReducedMotion(): boolean {
	return (
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

function setText(el: HTMLElement, text: string) {
	const only = el.childNodes.length === 1 ? el.firstChild : null;
	if (only && only.nodeType === Node.TEXT_NODE) only.nodeValue = text;
	else el.textContent = text;
}

const running = new WeakMap<HTMLElement, { stop: () => void }>();

/** NorviqMotion.animateValue — counts el's text from `from` to `to`, honouring data-format ("$" / "%"). */
export function animateValue(
	el: HTMLElement | null | undefined,
	from: string | number,
	to: string | number,
	duration = 420,
	easing: 'cubic' | 'spring' = 'cubic'
) {
	if (!el) return;
	const toText = String(to);
	if (prefersReducedMotion()) {
		setText(el, toText);
		return;
	}
	const initial = parseFloat(String(from).replace(/[^0-9.-]/g, '')) || 0;
	const target = parseFloat(String(to).replace(/[^0-9.-]/g, '')) || 0;
	const fmt = el.dataset.format || '';
	// Match the decimal precision of the target so cents never vanish mid-count.
	// eslint-disable-next-line no-sparse-arrays -- [match, group] shape for the fallback
	const decimals = (toText.match(/\.(\d+)/) || [, ''])[1]!.length;

	const ease =
		easing === 'spring'
			? (p: number) => {
					// Approximate spring (underdamped oscillation feel).
					const c = 1 + 2.5 * Math.exp(-5 * p) * Math.sin(12 * p);
					return Math.min(1, Math.max(0, 1 - (1 - p) * c));
				}
			: (p: number) => 1 - Math.pow(1 - p, 3); // easeOutCubic

	const render = (val: number) => {
		if (fmt.includes('$')) {
			setText(
				el,
				'$' +
					val.toLocaleString(undefined, {
						minimumFractionDigits: decimals,
						maximumFractionDigits: decimals
					})
			);
		} else if (fmt.includes('%')) {
			setText(el, val.toFixed(Math.max(decimals, 1)) + '%');
		} else {
			setText(
				el,
				val.toLocaleString(undefined, {
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals
				})
			);
		}
	};

	running.get(el)?.stop();
	const controls = animate(initial, target, {
		duration: duration / 1000,
		ease,
		onUpdate: render,
		onComplete: () => {
			setText(el, toText);
			el.classList.remove('value-flash-up', 'value-flash-down');
			running.delete(el);
		}
	});
	running.set(el, { stop: () => controls.stop() });
}

/**
 * Change direction for an element: data-direction ("up"/"positive",
 * "down"/"negative", "flat"/"neutral") wins, then the change-pill classes, then
 * a leading +/-. true = up, false = down, null = don't colour.
 */
export function getDirection(el: HTMLElement): boolean | null {
	const attr = (el.dataset.direction || '').toLowerCase();
	if (attr === 'up' || attr === 'positive') return true;
	if (attr === 'down' || attr === 'negative') return false;
	if (attr === 'flat' || attr === 'neutral') return null;

	if (el.classList.contains('overview-change-positive')) return true;
	if (el.classList.contains('stock-change-positive')) return true;
	if (el.classList.contains('overview-change-negative')) return false;
	if (el.classList.contains('stock-change-negative')) return false;

	const clean = (el.textContent || '').trim();
	if (clean.startsWith('+')) return true;
	if (/^-[\d$]/.test(clean)) return false;
	return null;
}

/**
 * NorviqMotion.flashChange — green/red flash (value-flash-up/-down) and, when
 * the text looks numeric and differs from data-prev-value, a count from the
 * previous value. positive null/undefined = count only, no colour.
 */
export function flashChange(el: HTMLElement | null | undefined, positive?: boolean | null) {
	if (!el || prefersReducedMotion()) return;
	el.classList.remove('value-flash-up', 'value-flash-down');
	if (positive !== null && positive !== undefined) {
		void el.offsetWidth;
		el.classList.add(positive ? 'value-flash-up' : 'value-flash-down');
	}
	const current = (el.textContent || '').trim();
	if (/^[+-]?[\d$,.%]/.test(current)) {
		const prev = el.dataset.prevValue;
		if (prev && prev !== current) animateValue(el, prev, current, 380);
		el.dataset.prevValue = current;
	}
}

/** NorviqMotion.staggerReveal — fades/lifts the matching children in sequence (delay capped at 420ms). */
export function staggerReveal(
	container: Element | null | undefined,
	selector = ':scope > *',
	baseDelay = 40
) {
	if (!container || prefersReducedMotion()) return;
	container.querySelectorAll<HTMLElement>(selector).forEach((el, i) => {
		const delay = Math.min(i * baseDelay, 420);
		el.style.opacity = '0';
		el.style.transform = 'translateY(6px)';
		requestAnimationFrame(() => {
			el.style.transition =
				'opacity var(--motion-med) var(--ease-decelerate), transform var(--motion-med) var(--ease-decelerate)';
			el.style.transitionDelay = `${delay}ms`;
			el.style.opacity = '1';
			el.style.transform = 'translateY(0)';
			el.addEventListener(
				'transitionend',
				() => {
					el.style.transition = '';
					el.style.transitionDelay = '';
				},
				{ once: true }
			);
		});
	});
}

const segResize = new WeakMap<Element, ResizeObserver>();

/**
 * NorviqMotion.segmentClip — clips .pines-segment-overlay to the active
 * .pines-segment-btn[data-seg-id] so the pill slides between options; keeps
 * re-measuring on resize.
 */
export function segmentClip(root: HTMLElement, value: string | number) {
	const overlay = root.querySelector<HTMLElement>('.pines-segment-overlay');
	const btn = root.querySelector<HTMLElement>(
		`.pines-segment-btn[data-seg-id="${CSS.escape(String(value))}"]`
	);
	if (!overlay || !btn) return;
	const rootRect = root.getBoundingClientRect();
	const btnRect = btn.getBoundingClientRect();
	const pad = 2; // .pines-segment p-0.5
	const left = Math.max(0, btnRect.left - rootRect.left - pad);
	const right = Math.max(0, rootRect.right - btnRect.right - pad);
	overlay.style.clipPath = `inset(0 ${right}px 0 ${left}px round 6px)`;
	root.setAttribute('data-seg-ready', '');

	if (!segResize.has(root) && typeof ResizeObserver !== 'undefined') {
		const ro = new ResizeObserver(() => {
			const active = root.querySelector('.pines-segment-btn-active');
			if (active) segmentClip(root, active.getAttribute('data-seg-id') ?? '');
		});
		ro.observe(root);
		segResize.set(root, ro);
	}
}

const VALUE_SELECTOR =
	'.nq-hero-value, .overview-wealth-value, .dash-kpi-value, .portfolio-hero-value';

function countUpElement(el: HTMLElement) {
	const val = (el.textContent || '').trim();
	if (!val || el.dataset.animated === 'true') return;
	el.dataset.prevValue = val;
	// One short cubic count from 92% for currency figures — "settling into
	// place", not celebration.
	if (el.dataset.format && el.dataset.format.includes('$')) {
		const num = parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;
		const startFrom = Math.max(0, num * 0.92);
		setText(el, '$' + Math.round(startFrom).toLocaleString());
		animateValue(el, startFrom, val, 480);
	}
	el.dataset.animated = 'true';
}

/** triggerInitialValueAnimations — count-up on hero / wealth / KPI figures inside root. */
export function triggerInitialValueAnimations(root: Element | Document = document) {
	if (prefersReducedMotion()) return;
	root.querySelectorAll<HTMLElement>(VALUE_SELECTOR).forEach(countUpElement);
}

/** initScrollTaste — [data-motion-reveal] gets .is-visible on intersection; [data-scrub-text] reveals word by word. */
export function initScrollTaste(root: Element | Document = document): () => void {
	const revealItems = root.querySelectorAll<HTMLElement>('[data-motion-reveal]');
	if (prefersReducedMotion()) {
		revealItems.forEach((el) => el.classList.add('is-visible'));
		return () => {};
	}
	const cleanups: (() => void)[] = [];
	revealItems.forEach((el) => cleanups.push(observeReveal(el)));
	root
		.querySelectorAll<HTMLElement>('[data-scrub-text]')
		.forEach((el) => cleanups.push(splitScrub(el)));
	return () => cleanups.forEach((fn) => fn());
}

function observeReveal(el: HTMLElement): () => void {
	const io = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				entry.target.classList.add('is-visible');
				io.unobserve(entry.target);
			});
		},
		{ threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
	);
	io.observe(el);
	return () => io.disconnect();
}

// Replaces the block's text with .scrub-word spans. Only use on static text:
// Svelte must not re-render the element's content afterwards.
function splitScrub(block: HTMLElement): () => void {
	if (block.dataset.scrubReady !== 'true') {
		const words = (block.textContent || '').trim().split(/\s+/);
		block.textContent = '';
		words.forEach((word, index) => {
			const span = document.createElement('span');
			span.className = 'scrub-word';
			span.textContent = word;
			span.style.transitionDelay = `${Math.min(index * 18, 420)}ms`;
			block.appendChild(span);
			block.appendChild(document.createTextNode(' '));
		});
		block.dataset.scrubReady = 'true';
	}
	const io = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) entry.target.classList.add('is-visible');
			});
		},
		{ threshold: 0.7 }
	);
	block.querySelectorAll('.scrub-word').forEach((w) => io.observe(w));
	return () => io.disconnect();
}

function staggerDefaults(root: Element | Document) {
	const activityList = root.querySelector('.overview-activity-list, .nq-list');
	if (activityList) staggerReveal(activityList, ':scope > li, :scope > div', 28);
	const positions = root.querySelector('.portfolio-positions');
	if (positions) staggerReveal(positions, ':scope > div', 26);
	const kpiStrip = root.querySelector('.dash-kpi-strip');
	if (kpiStrip) staggerReveal(kpiStrip, ':scope > .dash-kpi-cell', 55);
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

/**
 * initFirstPaintMotion, scoped to the element: once per browser session sets
 * body[data-first-visit] (KPI shimmer), then after 140ms runs the scroll reveal,
 * the hero/KPI count-ups and the default staggers (first .overview-activity-list
 * / .nq-list, .portfolio-positions, .dash-kpi-strip). Re-runs the count-ups on
 * `theme-changed`. Put it on a page's root (or the app layout's content slot,
 * keyed on the route, to replay on every navigation like boosted swaps did).
 */
export function pageMotion(): Attachment<HTMLElement> {
	return (node) => {
		try {
			if (!sessionStorage.getItem('norviq-visited')) {
				sessionStorage.setItem('norviq-visited', '1');
				document.body.setAttribute('data-first-visit', '');
			}
		} catch {
			/* storage blocked — skip the shimmer */
		}
		let cleanupReveal = () => {};
		const timer = setTimeout(() => {
			cleanupReveal = initScrollTaste(node);
			triggerInitialValueAnimations(node);
			staggerDefaults(node);
		}, 140);
		let themeTimer: ReturnType<typeof setTimeout> | undefined;
		const onTheme = () => {
			clearTimeout(themeTimer);
			themeTimer = setTimeout(() => triggerInitialValueAnimations(node), 80);
		};
		window.addEventListener('theme-changed', onTheme);
		return () => {
			clearTimeout(timer);
			clearTimeout(themeTimer);
			window.removeEventListener('theme-changed', onTheme);
			cleanupReveal();
		};
	};
}

/** staggerReveal(node, selector, baseDelay) once the element mounts. */
export function staggerOnMount(selector = ':scope > *', baseDelay = 40): Attachment<HTMLElement> {
	return (node) => {
		const raf = requestAnimationFrame(() => staggerReveal(node, selector, baseDelay));
		return () => cancelAnimationFrame(raf);
	};
}

/** Scroll reveal for one element: adds .is-visible when it scrolls into view. */
export function reveal(): Attachment<HTMLElement> {
	return (node) => {
		if (prefersReducedMotion()) {
			node.classList.add('is-visible');
			return;
		}
		return observeReveal(node);
	};
}

/** data-scrub-text word-by-word reveal. Static text only. */
export function scrubText(): Attachment<HTMLElement> {
	return (node) => {
		if (prefersReducedMotion()) return;
		return splitScrub(node);
	};
}

/** First-paint count-up for one figure (what triggerInitialValueAnimations does per element). */
export function countUp(): Attachment<HTMLElement> {
	return (node) => {
		if (prefersReducedMotion()) return;
		const timer = setTimeout(() => countUpElement(node), 140);
		return () => clearTimeout(timer);
	};
}

/**
 * The htmx after-swap value flash, for client-side updates: whenever `value()`
 * changes after mount, flash the element (direction from getDirection unless
 * `direction()` is given) and count from the previous text. `springPop` adds
 * the 600ms .spring-pop used on hero / wealth figures.
 */
export function flashOnChange(
	value: () => unknown,
	opts: { direction?: () => boolean | null; springPop?: boolean } = {}
): Attachment<HTMLElement> {
	let first = true;
	return (node) => {
		value(); // track
		const dir = opts.direction?.();
		if (first) {
			first = false;
			node.dataset.prevValue = (node.textContent || '').trim();
			return;
		}
		// Read the text after this flush has patched it.
		let cancelled = false;
		let t: ReturnType<typeof setTimeout> | undefined;
		queueMicrotask(() => {
			if (cancelled) return;
			flashChange(node, dir !== undefined ? dir : getDirection(node));
			if (opts.springPop && !prefersReducedMotion()) {
				node.classList.add('spring-pop');
				t = setTimeout(() => node.classList.remove('spring-pop'), 600);
			}
		});
		return () => {
			cancelled = true;
			clearTimeout(t);
		};
	};
}
