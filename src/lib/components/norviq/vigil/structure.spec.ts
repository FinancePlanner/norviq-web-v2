import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';

const state = vi.hoisted(() => ({ page: { data: { locale: 'en' } } }));
vi.mock('$app/state', () => state);
vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn<() => void>() }));

import Section from './Section.svelte';
import ErrorRetry from './ErrorRetry.svelte';
import { createRawSnippet } from 'svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- one helper for components with different props
const html = (C: any, props: Record<string, unknown>) => render(C, { props }).body;
const body = createRawSnippet(() => ({ render: () => '<p>content</p>' }));

beforeEach(() => {
	state.page.data.locale = 'en';
});

describe('Section', () => {
	it('labels the section by its h2', () => {
		const out = html(Section, { title: 'Holdings', children: body });
		expect(out).toContain('<section');
		expect(out).toContain('vigil-section-title');
		const id = /<h2[^>]*id="([^"]+)"/.exec(out)?.[1];
		expect(id).toBeTruthy();
		expect(out).toContain(`aria-labelledby="${id}"`);
		expect(out).toContain('content');
	});

	it('uses an explicit id', () => {
		const out = html(Section, { title: 'Holdings', id: 'h', children: body });
		expect(out).toContain('aria-labelledby="h"');
	});

	it('is a rule, not a card: no background, radius or shadow in its style', () => {
		const src = readFileSync(new URL('./Section.svelte', import.meta.url), 'utf8');
		const style = /<style>([\s\S]*?)<\/style>/.exec(src)?.[1] ?? '';
		expect(style).toContain('--hairline');
		expect(style).not.toMatch(/background|border-radius|box-shadow/);
	});
});

describe('ErrorRetry', () => {
	it('renders an alert with the message and a Try again button', () => {
		const out = html(ErrorRetry, { message: 'Could not load activity' });
		expect(out).toContain('role="alert"');
		expect(out).toContain('Could not load activity');
		expect(out).toContain('Something went wrong');
		expect(out).toMatch(/<button[^>]*>[\s\S]*Try again/);
	});

	it('translates in pt-PT', () => {
		state.page.data.locale = 'pt-PT';
		expect(html(ErrorRetry, { message: 'x' })).toContain('Tentar novamente');
	});
});
