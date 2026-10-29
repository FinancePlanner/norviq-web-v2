// GET /dashboard/insights/ai (handlers.DashboardAIInsightsPartial behind
// RequireFeature(AIInsights) + RequireAIConsent). Go lazy-loaded it with
// hx-trigger="load"; here the insights page streams it as an un-awaited
// promise from its load, so the shell shows "Loading insights…" until it
// resolves.

import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { apiFetch } from '#lib/server/api.js';
import { AI_CONSENT_REQUIRED, hasAIConsent } from '../ai-consent.server.js';
import type { AIInsightCardVM, AIInsightsResult } from '../types.js';

type AIInsightCard = components['schemas']['AIInsightCardResponse'];

const kinds = [
	{ label: 'Portfolio', path: '/v1/ai/insights/portfolio' },
	{ label: 'Expenses', path: '/v1/ai/insights/expenses' },
	{ label: 'Summary', path: '/v1/ai/insights/summary' }
] as const;

interface Fetched {
	card: AIInsightCard | null;
	consentRequired: boolean;
	failed: boolean;
}

async function fetchCard(event: RequestEvent, path: string): Promise<Fetched> {
	try {
		const res = await apiFetch(event, 'GET', path);
		const text = await res.text();
		if (res.status === 200) {
			return { card: (text ? JSON.parse(text) : null) as AIInsightCard | null, consentRequired: false, failed: false };
		}
		// api.IsAIConsentRequired: a 403 whose body's reason is AI_CONSENT_REQUIRED.
		let reason = '';
		if (res.status === 403 && text) {
			try {
				reason = (JSON.parse(text) as { reason?: string }).reason ?? '';
			} catch {
				/* not the refusal */
			}
		}
		return { card: null, consentRequired: reason === AI_CONSENT_REQUIRED, failed: false };
	} catch (err) {
		console.warn('ai insight fetch failed', path, err);
		return { card: null, consentRequired: false, failed: true };
	}
}

/** loadAIInsightCard */
function toCard(label: string, f: Fetched): AIInsightCardVM {
	const vm: AIInsightCardVM = { kindLabel: label, title: '', body: '', disclaimer: '', highlights: [], error: '' };
	if (f.failed) {
		vm.error = 'Could not load this insight.';
		return vm;
	}
	if (!f.card) {
		vm.error = 'Insight unavailable.';
		return vm;
	}
	vm.title = (f.card.title ?? '').trim();
	vm.body = (f.card.body ?? '').trim();
	vm.disclaimer = (f.card.disclaimer ?? '').trim();
	vm.highlights = (f.card.highlights ?? []).map((h) => ({ label: (h.label ?? '').trim(), value: (h.value ?? '').trim() }));
	return vm;
}

export async function loadAIInsights(event: RequestEvent): Promise<AIInsightsResult> {
	// The insights page itself is the consent card's return path (Go used the
	// fragment's Referer, which was this page). Path only: after a no-JS form
	// action the URL still carries the `?/action` query.
	const next = event.url.pathname;
	if (!(await hasAIConsent(event))) return { consentRequired: true, next };

	// Go fetched the three kinds one after another and stopped at the first
	// consent refusal; fetching them together renders the same result sooner.
	const fetched = await Promise.all(kinds.map((k) => fetchCard(event, k.path)));
	if (fetched.some((f) => f.consentRequired)) return { consentRequired: true, next };
	return { consentRequired: false, cards: kinds.map((k, i) => toCard(k.label, fetched[i])) };
}
