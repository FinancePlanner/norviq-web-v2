import type { PageServerLoad } from './$types';
import { loadGrowViewModel } from '#lib/features/planning-tools/planning/planning.server.js';

// GET /planning/grow (PlanningGrow). Ungated, like the simulator.
export const load: PageServerLoad = async (event) => ({ vm: await loadGrowViewModel(event) });
