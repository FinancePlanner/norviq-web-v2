// Port of norviq-web internal/guide: the guided-start rules shared by the
// dashboard card and the step layer. Contract: norviq-shared/docs/guided-start.md.
// Isomorphic (no server imports).

export type Step = 'add_holding' | 'set_budget' | 'set_goal';
export const STEPS: Step[] = ['add_holding', 'set_budget', 'set_goal'];

export const HEADLINE = 'Get started with Norviq';
export const COMPLETION = "You're set up. Everything else builds on these three.";
export const SKIP_LABEL = 'Skip';
export const DISMISS_FAILED = "Couldn't hide that just now — try again in a moment.";
export const STEP_TIMEOUT_MS = 5 * 60 * 1000;

export const progressLabel = (done: number) => `${done} of ${STEPS.length}`;
export const isStep = (s: unknown): s is Step => s === 'add_holding' || s === 'set_budget' || s === 'set_goal';

const META: Record<Step, { title: string; line: string; target: string; path: string }> = {
	add_holding: { title: 'Add a holding', line: 'Add one stock or ETF you own.', target: 'holding-add', path: '/portfolio' },
	set_budget: { title: 'Set your budget', line: 'Enter your monthly take-home pay.', target: 'budget-salary', path: '/expenses' },
	set_goal: { title: 'Set a goal', line: "Pick one thing you're saving for.", target: 'goal-create', path: '/goals' }
};

export const stepTitle = (s: Step) => META[s].title;
export const stepLine = (s: Step) => META[s].line;
/** data-guide value of the control the step teaches. */
export const stepTarget = (s: Step) => META[s].target;
/** The page the target lives on. */
export const stepPath = (s: Step) => META[s].path;

export interface GuideProgressInput {
	funnelCompletedAt?: string | null;
	addHoldingCompleted?: boolean;
	setBudgetCompleted?: boolean;
	setGoalCompleted?: boolean;
	guidedStartDismissedAt?: string | null;
}

export function stepDone(s: Step, p: GuideProgressInput): boolean {
	switch (s) {
		case 'add_holding':
			return !!p.addHoldingCompleted;
		case 'set_budget':
			return !!p.setBudgetCompleted;
		case 'set_goal':
			return !!p.setGoalCompleted;
	}
}

export interface Progress {
	done: Record<Step, boolean>;
	/** '' when everything is done */
	next: Step | '';
	count: number;
}

export const allDone = (p: Progress) => p.next === '';

export function progressOf(p: GuideProgressInput | null): Progress {
	const out: Progress = { done: { add_holding: false, set_budget: false, set_goal: false }, next: '', count: 0 };
	for (const step of STEPS) {
		const done = !!p && stepDone(step, p);
		out.done[step] = done;
		if (done) out.count++;
		else if (out.next === '') out.next = step;
	}
	return out;
}

/** Card rule: loaded, funnel finished, not dismissed, not all done (unless reopened via Show me around). */
export function cardVisible(p: GuideProgressInput | null, showCompleted: boolean): boolean {
	if (!p || !p.funnelCompletedAt || p.guidedStartDismissedAt) return false;
	if (allDone(progressOf(p))) return showCompleted;
	return true;
}

/** The step to open: the requested one unless done, then the first open one; null when none is left. */
export function resolveStep(requested: Step, p: GuideProgressInput | null): Step | null {
	if (!p || !stepDone(requested, p)) return requested;
	const next = progressOf(p).next;
	return next === '' ? null : next;
}

/** Wait before poll number `attempt` (0-based): 1s, 2s, 4s, 8s, then every 10s. */
export function pollDelayMs(attempt: number): number {
	const backoff = [1000, 2000, 4000, 8000];
	return attempt >= 0 && attempt < backoff.length ? backoff[attempt] : 10000;
}

export interface CardVM {
	visible: boolean;
	progress: Progress;
	message: string;
	fireCardShown: boolean;
	fireCompleted: boolean;
}

export interface LayerVM {
	step: Step;
	source: string;
	announce: boolean;
}

export interface OutcomeVM {
	step: Step;
	elapsedMs: number;
	elsewhere: boolean;
}

/** Poll answer: 'pending' keep polling, 'done' completed, 'ended' timed out, 'none' no open step. */
export type PollResult =
	| { state: 'pending' }
	| { state: 'none' }
	| { state: 'done'; outcome: OutcomeVM }
	| { state: 'ended'; event: string; outcome: OutcomeVM };
