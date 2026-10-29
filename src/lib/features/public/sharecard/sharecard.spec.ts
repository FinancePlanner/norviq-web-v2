import { describe, expect, it } from 'vitest';
import { Instagram, OG, regionCode, render, renderBrief, Up } from './sharecard.server.js';

const isPNG = (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const size = (b: Uint8Array) => {
	const dv = new DataView(b.buffer, b.byteOffset);
	return [dv.getUint32(16), dv.getUint32(20)];
};

describe('sharecard', () => {
	it('draws the article card in both formats', async () => {
		const card = {
			title: 'Why the market shrugged off the Fed and what it means for long-duration tech names this quarter',
			tickers: ['NVDA', 'MSFT'],
			bullets: ['Rates held steady, as expected.', 'Guidance was the surprise: fewer cuts next year.', 'Long-duration tech sold off, then recovered.'],
			author: '@norviq',
			date: 'Oct 28, 2026',
			shortURL: 'norviq.org/a/abcd1234'
		};
		const og = await render(card, OG);
		const ig = await render(card, Instagram);
		expect(isPNG(og) && isPNG(ig)).toBe(true);
		expect(size(og)).toEqual([1200, 630]);
		expect(size(ig)).toEqual([1080, 1350]);
		if (process.env.SHARECARD_OUT) {
			const { writeFileSync } = await import('node:fs');
			writeFileSync(process.env.SHARECARD_OUT + '/article-og.png', og);
			writeFileSync(process.env.SHARECARD_OUT + '/article-card.png', ig);
		}
	});

	it('draws a brief with emoji dropped', async () => {
		const png = await renderBrief(
			{ title: 'Morning brief', date: '29 Oct 2026', rows: [{ region: 'DE', name: 'DAX 🚀', level: '25,704', change: '+0.44%', direction: Up }], items: ['📌 One'], shortURL: 'norviq.org/brief/2026-10-29/morning', disclaimer: 'AI-written.' },
			OG
		);
		expect(isPNG(png)).toBe(true);
	});

	it('turns flags into region codes', () => {
		expect(regionCode('🇩🇪')).toBe('DE');
		expect(regionCode('DE')).toBe('');
	});
});
