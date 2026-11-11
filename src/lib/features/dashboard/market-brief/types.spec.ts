import { describe, expect, it } from 'vitest';
import { briefSummaryRows, type MarketBriefVM } from './types.js';

const row = (name: string) => ({
	symbol: name,
	flag: '',
	name,
	level: '1',
	change: '+1%',
	direction: 'up'
});

describe('briefSummaryRows', () => {
	it('takes the leading rows of the first group that has quotes', () => {
		const vm = {
			groups: [
				{ id: 'a', title: 'A', tone: 'up', rows: [] },
				{ id: 'b', title: 'B', tone: 'up', rows: ['x', 'y', 'z', 'w'].map(row) }
			]
		} as unknown as MarketBriefVM;
		expect(briefSummaryRows(vm).map((r) => r.name)).toEqual(['x', 'y', 'z']);
	});

	it('is empty when the brief has no quotes', () => {
		expect(briefSummaryRows({ groups: [] } as unknown as MarketBriefVM)).toEqual([]);
	});
});
