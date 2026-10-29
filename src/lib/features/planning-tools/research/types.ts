// internal/pages/research view models. Client-safe.

export interface NoteRow {
	id: string;
	symbol: string;
	title: string;
	thesis: string;
	risks: string;
	catalyst: string;
}

export interface MemoRow {
	id: string;
	symbol: string;
	title: string;
	verdict: string;
	createdAt: string;
}

export interface ResearchPageVM {
	notes: NoteRow[];
	errorMessage: string;
	successMessage: string;
	filterSymbol: string;
	savedMemos: MemoRow[];
}

export interface MemoMarkRow {
	label: string;
	value: string;
}

export interface MemoSectionRow {
	heading: string;
	paragraphs: string[];
}

export interface MemoSourceRow {
	label: string;
	meta: string;
	url: string;
}

export interface MemoPageVM {
	id: string;
	symbol: string;
	title: string;
	createdAt: string;
	mark: MemoMarkRow[];
	sections: MemoSectionRow[];
	verdict: string;
	footer: string;
	sources: MemoSourceRow[];
	bookmarked: boolean;
}

/** api.PositionMemoCard: what the bookmark endpoint answers. */
export interface PositionMemoCard {
	id: string;
	symbol: string;
	title: string;
	verdict: string;
	bookmarked: boolean;
}
