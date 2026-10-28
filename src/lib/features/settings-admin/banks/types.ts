// Port of norviq-web internal/pages/settings/banks_viewmodel.go and bank_options.go.
import type { Option } from '#lib/components/norviq/index.js';

export interface BankConnectionRow {
	id: string;
	institution: string;
	statusLabel: string;
	statusKind: string; // active | reauth | disconnected | error
	accountsLine: string;
	lastSynced: string;
}

export interface BankTransactionRow {
	id: string;
	title: string;
	amount: string;
	date: string;
	pending: boolean;
	possibleDuplicate: boolean;
}

export interface BanksViewModel {
	isPro: boolean;
	connections: BankConnectionRow[];
	suggestions: BankTransactionRow[];
	errorMessage: string;
	successMessage: string;
}

export interface BankInstitutionRow {
	id: string;
	name: string;
	// Beta marks a bank whose aggregator integration is new.
	beta: boolean;
}

/**
 * pillarSelectOptions = components.PillarOptions(""): the three built-in
 * budget pillars (onboarding.BudgetPillars) in SortRank order. Dedupe with any
 * shared pillar list the expenses/onboarding ports add.
 */
export const pillarSelectOptions: Option[] = [
	{ value: 'fundamentals', label: 'Fundamentals' },
	{ value: 'futureYou', label: 'Future you' },
	{ value: 'fun', label: 'Fun' }
];

/** The countries the European bank picker offers (europeanBankPicker). */
export const bankCountries: Array<[string, string]> = [
	['PT', 'Portugal'],
	['ES', 'Spain'],
	['IE', 'Ireland'],
	['FR', 'France'],
	['DE', 'Germany'],
	['NL', 'Netherlands'],
	['IT', 'Italy'],
	['BE', 'Belgium'],
	['FI', 'Finland'],
	['SE', 'Sweden'],
	['NO', 'Norway'],
	['DK', 'Denmark']
];
