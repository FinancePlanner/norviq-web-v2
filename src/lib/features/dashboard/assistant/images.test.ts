import { expect, test } from 'vitest';
import { appendChatFiles, checkDocument, documentKind, scaledSize } from './images.js';

test('scaledSize keeps aspect and never upscales', () => {
	expect(scaledSize(3136, 1000)).toEqual({ width: 1568, height: 500 });
	expect(scaledSize(1000, 3136)).toEqual({ width: 500, height: 1568 });
	expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
	expect(scaledSize(1568, 1568)).toEqual({ width: 1568, height: 1568 });
	expect(scaledSize(4000, 10, 1000)).toEqual({ width: 1000, height: 3 });
});

const file = (name: string, type = '', size = 1) =>
	new File([new Uint8Array(size)], name, { type });

test('documentKind reads a PDF by type or extension and a CSV by extension', () => {
	expect(documentKind(file('a.pdf', 'application/pdf'))).toBe('pdf');
	expect(documentKind(file('A.PDF'))).toBe('pdf');
	expect(documentKind(file('positions.csv', 'text/csv'))).toBe('csv');
	// Windows reports CSVs as an Excel type; the backend keys on the .csv name.
	expect(documentKind(file('positions.CSV', 'application/vnd.ms-excel'))).toBe('csv');
	expect(documentKind(file('notes.txt', 'text/plain'))).toBeNull();
	expect(documentKind(file('x.png', 'image/png'))).toBeNull();
});

test('checkDocument enforces the backend size limits and one of each kind', () => {
	expect(checkDocument(file('a.pdf', 'application/pdf', 8 << 20), 'pdf', [])).toBeNull();
	expect(checkDocument(file('a.pdf', 'application/pdf', (8 << 20) + 1), 'pdf', [])).toBe(
		'Each PDF must be 8 MB or smaller.'
	);
	expect(checkDocument(file('a.csv', '', 1 << 20), 'csv', [])).toBeNull();
	expect(checkDocument(file('a.csv', '', (1 << 20) + 1), 'csv', [])).toBe(
		'Each CSV must be 1 MB or smaller.'
	);
	expect(checkDocument(file('b.pdf'), 'pdf', ['image', 'pdf'])).toBe('Attach one PDF at a time.');
	expect(checkDocument(file('b.csv'), 'csv', ['csv'])).toBe('Attach one CSV at a time.');
	expect(checkDocument(file('b.csv'), 'csv', ['pdf', 'image'])).toBeNull();
});

test('appendChatFiles sends every file under the field name iOS uses', () => {
	const body = new FormData();
	appendChatFiles(body, [file('a.jpg', 'image/jpeg'), file('b.csv', 'text/csv')]);
	expect(body.getAll('file').map((f) => (f as File).name)).toEqual(['a.jpg', 'b.csv']);
	expect(body.getAll('image')).toHaveLength(0);
});
