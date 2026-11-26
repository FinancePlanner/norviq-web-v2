import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const src = readFileSync(new URL('./LandingPage.svelte', import.meta.url), 'utf8');
const ibkr = src.slice(src.indexOf('id="ibkr"'), src.indexOf('id="eu-tax"')).replace(/\s+/g, ' ');

test('the IBKR section describes screenshot import, not the retired token flow', () => {
	expect(ibkr).not.toContain('reportingintegration');
	expect(ibkr).not.toContain('query ID');
	expect(ibkr).not.toContain('Settings → Integrations');
	expect(ibkr).toContain('Statement import with full trade history is coming next.');
	expect(ibkr).toContain('choose Import from broker, then IBKR, then Screenshots.');
});
