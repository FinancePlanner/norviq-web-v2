import { browser } from '$app/env';
import { DOMAIN_ORDER } from '#lib/nav/destinations.js';

// Sidebar rail + group open state. In the Go web this lived on <html> because
// hx-boost replaced <body> on every navigation; here the shell persists across
// navigations, so plain state works. The storage keys and value formats are
// unchanged so a reader's saved rail preference carries over.

const SIDEBAR_KEY = 'app_sidebar';
const GROUPS_KEY = 'app_nav_groups';

/**
 * A saved "key:1,key:0" group list, keyed by domain (DS 2.0 P3). A save from the
 * old tab sidebar always holds a key that is not a domain, so it is dropped whole:
 * filtering key by key would keep its "community:0" (once the Boards group).
 */
export function parseGroups(raw: string | null): Map<string, boolean> | null {
	if (!raw) return null;
	const pairs = raw.split(',').map((pair) => pair.split(':'));
	if (!pairs.every(([k]) => (DOMAIN_ORDER as readonly string[]).includes(k))) return null;
	return new Map(pairs.map(([k, v]) => [k, v === '1']));
}

function readGroups(): Map<string, boolean> | null {
	if (!browser) return null;
	try {
		return parseGroups(localStorage.getItem(GROUPS_KEY));
	} catch {
		return null;
	}
}

class ShellState {
	collapsed = $state(browser && document.documentElement.dataset.sidebar === 'collapsed');
	groups = $state<Map<string, boolean> | null>(readGroups());

	toggleSidebar() {
		this.collapsed = !this.collapsed;
		const root = document.documentElement;
		try {
			if (this.collapsed) {
				root.dataset.sidebar = 'collapsed';
				localStorage.setItem(SIDEBAR_KEY, 'collapsed');
			} else {
				delete root.dataset.sidebar;
				localStorage.removeItem(SIDEBAR_KEY);
			}
		} catch {
			/* storage blocked */
		}
		window.dispatchEvent(
			new CustomEvent('sidebar-changed', { detail: { collapsed: this.collapsed } })
		);
	}

	/** Explicit preference, else the default: the active domain's group is open. */
	isOpen(key: string, activeDomain: string | null): boolean {
		return this.groups?.get(key) ?? key === activeDomain;
	}

	toggleGroup(key: string, allKeys: string[], activeDomain: string | null) {
		// Persist every group, not only the toggled one, so the "active group is
		// open" fallback cannot re-open a group the reader closed (theme.js).
		const next = new Map(allKeys.map((k) => [k, this.isOpen(k, activeDomain)]));
		next.set(key, !next.get(key));
		this.groups = next;
		try {
			localStorage.setItem(
				GROUPS_KEY,
				Array.from(next, ([k, o]) => `${k}:${o ? '1' : '0'}`).join(',')
			);
		} catch {
			/* storage blocked */
		}
	}
}

export const shell = new ShellState();
