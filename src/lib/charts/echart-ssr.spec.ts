import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import EChart from './EChart.svelte';

describe('EChart (server render)', () => {
	it('labels the chart for assistive tech when the spec gives a summary', () => {
		const { body } = render(EChart, {
			props: { id: 'wealth_chart', option: {}, summary: 'Portfolio up 3.2% over 1 month' }
		});
		expect(body).toContain('role="img"');
		expect(body).toContain('aria-label="Portfolio up 3.2% over 1 month"');
	});

	it('adds no role without a summary', () => {
		const { body } = render(EChart, { props: { id: 'x', option: {} } });
		expect(body).not.toContain('role="img"');
	});
});
