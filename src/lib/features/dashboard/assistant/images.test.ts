import { expect, test } from 'vitest';
import { scaledSize } from './images.js';

test('scaledSize keeps aspect and never upscales', () => {
	expect(scaledSize(3136, 1000)).toEqual({ width: 1568, height: 500 });
	expect(scaledSize(1000, 3136)).toEqual({ width: 500, height: 1568 });
	expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
	expect(scaledSize(1568, 1568)).toEqual({ width: 1568, height: 1568 });
	expect(scaledSize(4000, 10, 1000)).toEqual({ width: 1000, height: 3 });
});
