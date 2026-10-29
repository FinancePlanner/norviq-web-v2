import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { formatFloat } from '#lib/format.js';
import { formatGoDate, parseTime } from '../integrations/go-time.js';
import type { BankConnectionRow, BankTransactionRow, BanksViewModel } from './types.js';

// Ports of norviq-web internal/api/bank.go (hand-written client: doBankRequest),
// internal/handlers/settings_banks.go loadBanksVM and settings_banks_data.go.

interface BankAccount {
	id: string;
	name: string;
	mask?: string | null;
	currency?: string | null;
	type?: string | null;
	balance?: number | null;
}

interface BankConnection {
	id: string;
	provider: string;
	institutionName?: string | null;
	status: string;
	consentExpiresAt?: string | null;
	lastSyncedAt?: string | null;
	accounts?: BankAccount[] | null;
}

interface BankTransaction {
	id: string;
	accountId: string;
	amount: number;
	currency?: string | null;
	date: string;
	merchant?: string | null;
	descriptionText?: string | null;
	pending: boolean;
	status: string;
	providerCategory?: string | null;
	expenseId?: string | null;
	possibleDuplicate: boolean;
}

export interface BankLinkSession {
	provider: string;
	linkToken?: string | null;
	hostedURL?: string | null;
	expiration?: string | null;
}

export interface BankInstitution {
	id: string;
	name: string;
	bic?: string | null;
	logoURL?: string | null;
	country?: string | null;
	beta?: boolean | null;
}

export async function loadBanksVM(event: RequestEvent, isPro: boolean): Promise<BanksViewModel> {
	const vm: BanksViewModel = { isPro, connections: [], suggestions: [], errorMessage: '', successMessage: '' };
	if (!vm.isPro) return vm;

	let connections: BankConnection[];
	try {
		connections = (await apiJSON<BankConnection[]>(event, 'GET', '/v1/banks/connections')) ?? [];
	} catch {
		vm.errorMessage = 'Could not load your bank connections.';
		return vm;
	}
	vm.connections = connections.map(mapBankConnection);

	let transactions: BankTransaction[];
	try {
		transactions = (await apiJSON<BankTransaction[]>(event, 'GET', '/v1/banks/transactions', undefined, { query: { status: 'suggested' } })) ?? [];
	} catch {
		vm.errorMessage = 'Could not load synced transactions.';
		return vm;
	}
	vm.suggestions = transactions.map(mapBankTransaction);
	return vm;
}

function mapBankConnection(c: BankConnection): BankConnectionRow {
	const row: BankConnectionRow = {
		id: c.id,
		institution: c.institutionName ? c.institutionName : 'Bank',
		statusLabel: 'Error',
		statusKind: 'error',
		accountsLine: '',
		lastSynced: ''
	};
	switch (c.status) {
		case 'active':
			[row.statusLabel, row.statusKind] = ['Connected', 'active'];
			break;
		case 'reauth_required':
			[row.statusLabel, row.statusKind] = ['Reconnect needed', 'reauth'];
			break;
		case 'disconnected':
			[row.statusLabel, row.statusKind] = ['Disconnected', 'disconnected'];
			break;
	}
	const accounts = c.accounts ?? [];
	if (accounts.length > 0) {
		const first = accounts[0];
		let name = first.name;
		if (first.mask) name = `${name} ••${first.mask}`;
		if (accounts.length > 1) name = `${name} + ${accounts.length - 1} more`;
		row.accountsLine = name;
	}
	const lastSynced = parseTime(c.lastSyncedAt);
	if (lastSynced) row.lastSynced = formatGoDate(lastSynced);
	return row;
}

function mapBankTransaction(t: BankTransaction): BankTransactionRow {
	let title = 'Transaction';
	if (t.merchant) title = t.merchant;
	else if (t.descriptionText) title = t.descriptionText;
	const currency = t.currency ? t.currency.toUpperCase() : 'USD';
	return {
		id: t.id,
		title,
		amount: `${formatFloat(Math.abs(t.amount), 2)} ${currency}`,
		date: t.date,
		pending: !!t.pending,
		possibleDuplicate: !!t.possibleDuplicate
	};
}

/** validatedBankHostedURL: only an absolute https URL with a host is followed. */
export function validatedBankHostedURL(raw: string): string | null {
	try {
		const parsed = new URL(raw.trim());
		if (parsed.protocol.toLowerCase() !== 'https:' || parsed.host === '') return null;
		return parsed.toString();
	} catch {
		return null;
	}
}
