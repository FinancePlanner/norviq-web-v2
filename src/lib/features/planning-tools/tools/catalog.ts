import { Feature } from '#lib/billing.js';
import { Path } from '#lib/nav.js';

// The Tools hub. Labels are the existing nav labels, unchanged; `question` is
// what each tool answers, so people can find it without knowing its name.
export interface ToolEntry {
	label: string;
	question: string;
	path: string;
	featureKey?: string;
}

export const toolsCatalog: ToolEntry[] = [
	{ label: 'Grow', question: 'How much will I have in X years?', path: '/planning/grow' },
	{ label: 'Retire', question: 'How much do I need to retire?', path: '/planning/retire' },
	{
		label: 'Terminal sizing',
		question: 'How many shares does my target position take?',
		path: Path.Terminal
	},
	{
		label: 'Simulator',
		question: 'What would a different portfolio look like?',
		path: '/simulator'
	},
	{
		label: 'Rebalancing',
		question: 'How far has my portfolio drifted?',
		path: Path.Portfolio + '/rebalancing',
		featureKey: Feature.RebalancingRules
	}
];

/** With billing unknown no Pro marks are drawn, as in `featureLockedPredicate`. */
export function toolIsLocked(
	entry: ToolEntry,
	features: Record<string, boolean>,
	billingUnknown: boolean
): boolean {
	if (!entry.featureKey || billingUnknown) return false;
	return !features[entry.featureKey];
}
