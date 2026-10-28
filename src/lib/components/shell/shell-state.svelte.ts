import { browser } from '$app/env';

// Sidebar rail + group open state. In the Go web this lived on <html> because
// hx-boost replaced <body> on every navigation; here the shell persists across
// navigations, so plain state works. The storage keys and value formats are
// unchanged so a reader's saved preferences carry over.

const SIDEBAR_KEY = 'app_sidebar';
const GROUPS_KEY = 'app_nav_groups';

function readGroups(): Map<string, boolean> | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(GROUPS_KEY);
		if (!raw) return null;
		return new Map(
			raw.split(',').map((pair) => {
				const [k, v] = pair.split(':');
				return [k, v === '1'] as [string, boolean];
			})
		);
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
		window.dispatchEvent(new CustomEvent('sidebar-changed', { detail: { collapsed: this.collapsed } }));
	}

	/** Explicit preference, else the server default: the active tab's group is open. */
	isOpen(key: string, activeTab: string): boolean {
		return this.groups?.get(key) ?? key === activeTab;
	}

	toggleGroup(key: string, allKeys: string[], activeTab: string) {
		// Persist every group, not only the toggled one, so the "active group is
		// open" fallback cannot re-open a group the reader closed (theme.js).
		const next = new Map(allKeys.map((k) => [k, this.isOpen(k, activeTab)]));
		next.set(key, !next.get(key));
		this.groups = next;
		try {
			localStorage.setItem(GROUPS_KEY, Array.from(next, ([k, o]) => `${k}:${o ? '1' : '0'}`).join(','));
		} catch {
			/* storage blocked */
		}
	}
}

export const shell = new ShellState();
