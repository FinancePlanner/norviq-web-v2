import { describe, expect, it } from 'vitest';
import catalogue from './pt-PT.json';

// Strings the DS 2.0 ErrorRetry call sites pass through t(): each needs a real pt-PT entry.
const keys = [
	'Financial health',
	'Financial health is unavailable right now.',
	'Recent expenses are unavailable right now.',
	'Economy pulse',
	'Market news is unavailable right now.'
];

describe('pt-PT catalogue', () => {
	it.each(keys)('translates %s', (key) => {
		const value = (catalogue as Record<string, string>)[key];
		expect(value).toBeTruthy();
		expect(value).not.toBe(key);
	});
});
