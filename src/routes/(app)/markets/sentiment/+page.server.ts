import type { PageServerLoad } from './$types';
import { loadSentimentBoard } from '#lib/features/insights/markets/load.server.js';

// handlers.MarketsSentiment + MarketsSentimentBoard: the board was an htmx
// partial loaded on page load; here it is a streamed promise behind the same
// skeleton. Failures render the explicit empty state, never an error page.
export const load: PageServerLoad = (event) => ({ board: loadSentimentBoard(event) });
