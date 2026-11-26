import { describe, expect, it } from 'vitest';
import { Circle } from '@lucide/svelte';
import { DESTINATIONS } from '#lib/nav/destinations.js';
import { sidebarIcon } from './nav-icons.js';

// The domain index pages and /more draw each destination's icon; Circle is the
// fallback for a path with none.
describe('nav icons', () => {
	it('gives every destination an icon of its own', () => {
		expect(DESTINATIONS.filter((d) => sidebarIcon(d.path) === Circle).map((d) => d.path)).toEqual(
			[]
		);
	});
});
