import { describe, expect, it } from 'vitest';
import { iconRegistry } from '#lib/components/norviq/tui/icon-registry.js';
import { achievementIcon, fallbackIcon, lucideByIconKey } from './icons.js';

// Port of internal/pages/achievements/icons_test.go: an unknown Lucide name
// renders nothing, so every mapped name must be in the kit registry.
describe('achievementIcon', () => {
	it('maps every iconKey to a registered Lucide name', () => {
		for (const [key, name] of Object.entries(lucideByIconKey)) {
			expect(iconRegistry[name], `${key} → ${name}`).toBeDefined();
		}
		expect(iconRegistry[fallbackIcon]).toBeDefined();
		expect(iconRegistry['lock']).toBeDefined();
	});

	it('falls back to award', () => {
		expect(achievementIcon('flame.fill')).toBe('flame');
		expect(achievementIcon('no.such.symbol')).toBe('award');
		expect(achievementIcon('toString')).toBe('award');
	});
});
