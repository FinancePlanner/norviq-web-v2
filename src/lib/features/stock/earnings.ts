// handlers/earnings_streak.go — the beat/miss headline and per-row verdict.

export interface EarningsStreak {
	headline: string;
	tone: string;
}

interface EarningsRun {
	date: string;
	beatStreak: number;
	missStreak: number;
}

/** headlineStreakOf: the newest row with a non-zero run names the symbol's streak. */
export function headlineEarningsStreak(runs: EarningsRun[]): EarningsStreak {
	const sorted = [...runs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
	for (const run of sorted) {
		if (run.beatStreak > 0) return { headline: 'Beat ' + quartersRunning(run.beatStreak), tone: 'positive' };
		if (run.missStreak > 0) return { headline: 'Missed ' + quartersRunning(run.missStreak), tone: 'negative' };
	}
	return { headline: '', tone: '' };
}

/** earningsRunVerdict: [verdict, tone]. */
export function earningsRowVerdict(beat: number, miss: number): [string, string] {
	if (beat > 0) return ['Beat', 'positive'];
	if (miss > 0) return ['Missed', 'negative'];
	return ['—', ''];
}

function quartersRunning(count: number): string {
	return String(count) + (count === 1 ? ' quarter running' : ' quarters running');
}
