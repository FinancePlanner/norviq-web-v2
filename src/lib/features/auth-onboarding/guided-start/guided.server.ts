// internal/session/guided_start.go + handlers/guided_start.go (server half).
import type { RequestEvent } from '@sveltejs/kit';
import { getOnboardingProgress, type OnboardingProgress } from '../onboarding/onboarding.server.js';
import { allDone, cardVisible, isStep, progressOf, type CardVM, type LayerVM } from './guide.js';

export const GuidedKey = {
	Step: 'guidedStartStep',
	StepStartedAt: 'guidedStartStepStartedAt', // unix ms (Go stored a time.Time)
	StepSource: 'guidedStartStepSource',
	StepAnnounced: 'guidedStartStepAnnounced',
	StepActed: 'guidedStartStepActed',
	PendingSource: 'guidedStartPendingSource',
	CardShown: 'guidedStartCardShown',
	ShowCompleted: 'guidedStartShowCompleted',
	CompletedSent: 'guidedStartCompletedSent'
} as const;

export interface ActiveGuidedStep {
	step: string;
	startedAt: number;
	source: string;
	announced: boolean;
	acted: boolean;
}

const sess = (event: RequestEvent) => event.locals.session;

export async function startGuidedStep(
	event: RequestEvent,
	step: string,
	source: string,
	now: number
) {
	const f = sess(event).data.flags;
	f[GuidedKey.Step] = step;
	f[GuidedKey.StepStartedAt] = now;
	f[GuidedKey.StepSource] = source;
	f[GuidedKey.StepAnnounced] = false;
	f[GuidedKey.StepActed] = false;
	await sess(event).save();
}

export function activeGuidedStep(event: RequestEvent): ActiveGuidedStep | null {
	const s = sess(event);
	const step = s.get<string>(GuidedKey.Step) ?? '';
	if (!step) return null;
	return {
		step,
		startedAt: Number(s.get<number>(GuidedKey.StepStartedAt) ?? 0),
		source: s.get<string>(GuidedKey.StepSource) ?? '',
		announced: !!s.get<boolean>(GuidedKey.StepAnnounced),
		acted: !!s.get<boolean>(GuidedKey.StepActed)
	};
}

/**
 * session.NoteGuidedAction: the user did the open step's action here, so its
 * completion is not reported as having happened on another device. Pages that
 * own the step targets (portfolio add, budget salary, goal create) call this
 * from their form actions.
 */
export async function noteGuidedAction(event: RequestEvent, step: string) {
	if (sess(event).get<string>(GuidedKey.Step) === step)
		await sess(event).set(GuidedKey.StepActed, true);
}

export async function clearGuidedStep(event: RequestEvent) {
	await sess(event).remove(
		GuidedKey.Step,
		GuidedKey.StepStartedAt,
		GuidedKey.StepSource,
		GuidedKey.StepAnnounced,
		GuidedKey.StepActed
	);
}

/** session.SetGuidedPendingSource — used by POST /settings/show-me-around ("settings"). */
export async function setGuidedPendingSource(event: RequestEvent, source: string) {
	await sess(event).set(GuidedKey.PendingSource, source);
}

export async function takeGuidedPendingSource(event: RequestEvent): Promise<string> {
	const v = sess(event).get<string>(GuidedKey.PendingSource) ?? '';
	if (v) await sess(event).remove(GuidedKey.PendingSource);
	return v;
}

export async function setGuidedShowCompleted(event: RequestEvent) {
	await sess(event).set(GuidedKey.ShowCompleted, true);
}

async function markOnce(event: RequestEvent, key: string): Promise<boolean> {
	if (sess(event).get<boolean>(key)) return false;
	await sess(event).set(key, true);
	return true;
}

/** guidedCardVM: the dashboard card. Unloaded progress renders nothing. */
export async function guidedCardVM(
	event: RequestEvent,
	progress: OnboardingProgress | null,
	message = ''
): Promise<CardVM> {
	const p = progressOf(progress);
	const hidden: CardVM = {
		visible: false,
		progress: p,
		message: '',
		fireCardShown: false,
		fireCompleted: false
	};
	if (!cardVisible(progress, !!sess(event).get<boolean>(GuidedKey.ShowCompleted))) return hidden;
	const vm: CardVM = {
		visible: true,
		progress: p,
		message,
		fireCardShown: false,
		fireCompleted: false
	};
	vm.fireCardShown = await markOnce(event, GuidedKey.CardShown);
	if (allDone(p)) vm.fireCompleted = await markOnce(event, GuidedKey.CompletedSent);
	return vm;
}

/** Convenience for the dashboard load: read progress, build the card. */
export async function loadGuidedCard(event: RequestEvent): Promise<CardVM> {
	return guidedCardVM(event, await getOnboardingProgress(event));
}

/**
 * withGuidedStepLayer: the step layer for any app page while a step is open.
 * Reads only the session (no backend call). Marks the step announced the
 * first time it is shown.
 */
export async function guidedStepLayer(event: RequestEvent): Promise<LayerVM | null> {
	const active = activeGuidedStep(event);
	if (!active) return null;
	if (!isStep(active.step)) {
		await clearGuidedStep(event);
		return null;
	}
	const announce = !active.announced;
	if (announce) await sess(event).set(GuidedKey.StepAnnounced, true);
	return { step: active.step, source: active.source, announce };
}
