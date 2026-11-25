import { describe, expect, it } from 'vitest';
import { parseCryptoCoinRange } from './crypto.server.js';

describe('coin chart range', () => {
	it('maps the display key to the backend wire value', () => {
		expect(parseCryptoCoinRange('YTD')).toEqual({ range: 'YTD', wire: 'ytd' });
		expect(parseCryptoCoinRange('ALL')).toEqual({ range: 'ALL', wire: 'all' });
		expect(parseCryptoCoinRange('1W')).toEqual({ range: '1W', wire: '1w' });
	});

	it('still parses the old lowercase query strings', () => {
		expect(parseCryptoCoinRange('3m')).toEqual({ range: '3M', wire: '3m' });
		expect(parseCryptoCoinRange('all')).toEqual({ range: 'ALL', wire: 'all' });
	});

	it('falls back to one year', () => {
		expect(parseCryptoCoinRange(null)).toEqual({ range: '1Y', wire: '1y' });
		expect(parseCryptoCoinRange('1D')).toEqual({ range: '1Y', wire: '1y' });
	});
});
