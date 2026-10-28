// Port of norviq-web internal/server/assets/theme.js (appearance only — the
// sidebar parts live in #lib/components/shell/shell-state.svelte.ts).
//
// The pre-paint script in src/app.html applies the stored mode before first
// paint; this module keeps it in sync afterwards. localStorage key and values
// match iOS AppAppearance.storageKey.
import { browser } from '$app/env';

export const THEME_STORAGE_KEY = 'app_appearance';
export type ThemeMode = 'system' | 'light' | 'dark';

const VALID_THEMES = new Set<ThemeMode>(['system', 'light', 'dark']);

/** KEEP IN SYNC with --color-page-bg in legacy theme.css and the theme-color metas in app.html. */
export const THEME_COLORS = { 'vigil-light': '#f3f8fa', 'vigil-dark': '#050809' } as const;

export function getStoredTheme(): ThemeMode {
	if (!browser) return 'system';
	let stored: string | null = null;
	try {
		stored = localStorage.getItem(THEME_STORAGE_KEY);
	} catch {
		/* storage blocked */
	}
	return VALID_THEMES.has(stored as ThemeMode) ? (stored as ThemeMode) : 'system';
}

export function resolveIsDark(mode: ThemeMode): boolean {
	if (mode === 'dark') return true;
	if (mode === 'light') return false;
	return browser && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function updateThemeColor(mode: ThemeMode) {
	// app.html ships one theme-color meta per OS scheme; the stored appearance can
	// disagree with the OS, so both get the resolved colour.
	const color = resolveIsDark(mode) ? THEME_COLORS['vigil-dark'] : THEME_COLORS['vigil-light'];
	document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', color));
}

// Starts at the server-rendered defaults so hydration matches; initTheme()
// (on mount) loads the stored value.
class ThemeState {
	/** The stored appearance: system | light | dark (themePicker().mode). */
	mode = $state<ThemeMode>('system');
	/** Whether the resolved appearance is dark right now. */
	isDark = $state(false);
}

export const theme = new ThemeState();

/** applyTheme(mode) — sets data-theme + .dark on <html>, persists, fires `theme-changed`. */
export function applyTheme(mode: ThemeMode) {
	if (!browser) return;
	const root = document.documentElement;
	root.dataset.theme = mode;
	const dark = resolveIsDark(mode);
	root.classList.toggle('dark', dark);
	try {
		localStorage.setItem(THEME_STORAGE_KEY, mode);
	} catch {
		/* storage blocked — the choice still applies for this page */
	}
	updateThemeColor(mode);
	theme.mode = mode;
	theme.isDark = dark;
	window.dispatchEvent(new CustomEvent('theme-changed', { detail: { mode } }));
}

let initialised = false;

/**
 * initTheme() — apply the stored mode and follow OS changes while in "system".
 * Idempotent; returns a cleanup. Call once from the root layout (onMount);
 * ThemeToggle also calls it so the picker works on its own.
 */
export function initTheme(): () => void {
	if (!browser || initialised) return () => {};
	initialised = true;
	applyTheme(getStoredTheme());
	const mq = window.matchMedia('(prefers-color-scheme: dark)');
	const onChange = () => {
		if (getStoredTheme() === 'system') applyTheme('system');
	};
	mq.addEventListener('change', onChange);
	const onStorage = (event: StorageEvent) => {
		if (event.key === THEME_STORAGE_KEY) applyTheme(getStoredTheme());
	};
	window.addEventListener('storage', onStorage);
	return () => {
		initialised = false;
		mq.removeEventListener('change', onChange);
		window.removeEventListener('storage', onStorage);
	};
}
