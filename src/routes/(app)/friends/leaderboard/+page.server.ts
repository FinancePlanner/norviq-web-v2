import type { PageServerLoad } from './$types';
import { requireLeaderboards } from '#lib/features/social/gates.server.js';
import { formChoice } from '#lib/features/settings-admin/social/privacy.js';
import { socialDo, socialErrorMessage } from '#lib/features/social/friends/friends.server.js';
import { Leaderboard, type LeaderboardBoard } from '#lib/features/social/friends/types.js';

// Port of handlers.Leaderboard: /friends/leaderboard?metric=&period=, xp/week by default.
export const load: PageServerLoad = async (event) => {
	await requireLeaderboards(event);
	const q = event.url.searchParams;
	const metric = formChoice(
		q.get('metric') ?? '',
		Leaderboard.XP,
		Leaderboard.ReturnPercent,
		Leaderboard.CheckInStreak,
		Leaderboard.BudgetStreak
	);
	const period = formChoice(q.get('period') ?? '', Leaderboard.Week, Leaderboard.Month);
	try {
		const board = await socialDo<LeaderboardBoard>(
			event,
			'GET',
			'/v1/social/leaderboards?' + new URLSearchParams({ metric, period })
		);
		return { metric, period, board, errorMessage: '' };
	} catch (err) {
		return {
			metric,
			period,
			board: null,
			errorMessage: socialErrorMessage(err, "Couldn't load the leaderboard.")
		};
	}
};
