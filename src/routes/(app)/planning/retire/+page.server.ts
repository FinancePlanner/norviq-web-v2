import type { PageServerLoad } from './$types';
import { loadRetireViewModel } from '#lib/features/planning-tools/planning/planning.server.js';

// GET /planning/retire (PlanningRetire). Ungated, like the simulator.
export const load: PageServerLoad = async (event) => ({ vm: await loadRetireViewModel(event) });
