// Server-side helpers for the /goals handlers: the parts of
// norviq-web internal/handlers/goal_planning.go that are not HTTP plumbing,
// plus the small shared helpers it borrows from other handler files
// (parseBoundedFloat, defaultString and formChoice from scenarios.go /
// portfolio_workspace.go, portfolioAPIErrorMessage, session.NoteGuidedAction).
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { isAPIError } from '#lib/server/api.js';
import type { GoalPlanInput } from './types.js';

/** strconv.ParseFloat(strings.TrimSpace(v)) + the [min, max] bounds check. */
export function parseBoundedFloat(value: FormDataEntryValue | null, minimum: number, maximum: number): number | null {
	const text = typeof value === 'string' ? value.trim() : '';
	if (text === '' || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text)) return null;
	const parsed = Number(text);
	if (Number.isNaN(parsed) || parsed < minimum || parsed > maximum) return null;
	return parsed;
}

export function defaultString(value: FormDataEntryValue | null, fallback: string): string {
	const text = typeof value === 'string' ? value.trim() : '';
	return text === '' ? fallback : text;
}

/** formChoice: the value when allowed, else the first allowed value. */
export function formChoice(value: FormDataEntryValue | null, ...allowed: string[]): string {
	return typeof value === 'string' && allowed.includes(value) ? value : allowed[0];
}

/** uuid.Parse(...).String(): canonical lower-case form, or null. */
export function parseUUID(raw: string | null | undefined): string | null {
	let text = (raw ?? '').trim();
	if (text.length === 45 && text.toLowerCase().startsWith('urn:uuid:')) text = text.slice(9);
	else if (text.length === 38 && text.startsWith('{') && text.endsWith('}')) text = text.slice(1, -1);
	let hex: string;
	if (text.length === 36) {
		if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(text)) return null;
		hex = text.replaceAll('-', '');
	} else if (text.length === 32 && /^[0-9a-fA-F]{32}$/.test(text)) {
		hex = text;
	} else {
		return null;
	}
	hex = hex.toLowerCase();
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** time.Parse("2006-01-02", value) succeeds. */
export function validISODate(value: FormDataEntryValue | null): value is string {
	if (typeof value !== 'string') return false;
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!m) return false;
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	if (mo < 1 || mo > 12 || d < 1) return false;
	const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
	return d <= days;
}

// net/http StatusText for the codes the backend actually returns.
const STATUS_TEXT: Record<number, string> = {
	400: 'Bad Request',
	401: 'Unauthorized',
	402: 'Payment Required',
	403: 'Forbidden',
	404: 'Not Found',
	405: 'Method Not Allowed',
	409: 'Conflict',
	410: 'Gone',
	413: 'Request Entity Too Large',
	415: 'Unsupported Media Type',
	422: 'Unprocessable Entity',
	429: 'Too Many Requests',
	500: 'Internal Server Error',
	501: 'Not Implemented',
	502: 'Bad Gateway',
	503: 'Service Unavailable',
	504: 'Gateway Timeout'
};

/**
 * portfolioAPIErrorMessage: the backend's reason (or the HTTP status text when
 * it gave none), unless that is just "Internal Server Error".
 */
export function portfolioAPIErrorMessage(err: unknown, fallback: string): string {
	if (!err) return fallback;
	let message = '';
	if (isAPIError(err)) message = (err.reason || STATUS_TEXT[err.status] || '').trim();
	else if (err instanceof Error) message = err.message.trim();
	if (message !== '' && message !== STATUS_TEXT[500]) return message;
	return fallback;
}

/** redirectFinancialGoals: 303 to /goals?notice=…|error=… */
export function redirectFinancialGoals(notice: string, errorMessage: string): never {
	const query = new URLSearchParams();
	if (errorMessage) query.set('error', errorMessage);
	if (notice) query.set('notice', notice);
	const encoded = query.toString();
	redirect(303, '/goals' + (encoded ? '?' + encoded : ''));
}

export { noteGuidedAction } from '../../auth-onboarding/guided-start/guided.server.js';

const GOAL_TYPES = [
	'retirement',
	'home_purchase',
	'financial_independence',
	'education',
	'emergency_fund',
	'investment_target',
	'custom'
];

/** financialGoalInputFromForm: the input, or a user-facing validation message. */
export function financialGoalInputFromForm(form: FormData): { input: GoalPlanInput; message: '' } | { message: string } {
	const name = String(form.get('name') ?? '').trim();
	const target = parseBoundedFloat(form.get('targetAmount'), 1, 1_000_000_000_000);
	const starting = parseBoundedFloat(defaultString(form.get('startingCapital'), '0'), 0, 1_000_000_000_000);
	const monthly = parseBoundedFloat(defaultString(form.get('monthlyContribution'), '0'), 0, 1_000_000_000);
	const allocation = parseBoundedFloat(defaultString(form.get('allocationPercentage'), '100'), 0, 100);
	const portfolioID = parseUUID(String(form.get('portfolioId') ?? ''));
	const date = form.get('targetDate');
	const currency = String(form.get('baseCurrency') ?? '')
		.trim()
		.toUpperCase();
	if (
		name === '' ||
		target === null ||
		starting === null ||
		monthly === null ||
		allocation === null ||
		portfolioID === null ||
		!validISODate(date) ||
		// Go's len() counts bytes.
		new TextEncoder().encode(currency).length !== 3
	) {
		return { message: 'Complete the goal with a valid target, date, currency, contribution, and portfolio.' };
	}
	return {
		message: '',
		input: {
			name,
			goalType: formChoice(form.get('goalType'), ...GOAL_TYPES),
			targetAmount: target,
			targetDate: date,
			baseCurrency: currency,
			startingCapital: starting,
			monthlyContribution: monthly,
			annualContributionGrowth: 0,
			inflationAssumption: 0.02,
			riskProfile: formChoice(form.get('riskProfile'), 'conservative', 'moderate', 'aggressive'),
			status: 'active',
			portfolioAllocations: [
				{ id: crypto.randomUUID(), portfolioListId: portfolioID, allocationPercentage: allocation }
			],
			expenseCategoryLinks: []
		}
	};
}
