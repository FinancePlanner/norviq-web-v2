import type { PageServerLoad } from './$types';
import { loadSimulatorViewModel } from '#lib/features/planning-tools/simulator/simulator.server.js';

// GET /simulator (Simulator). Deliberately ungated in Go (server.go).
export const load: PageServerLoad = async (event) => ({ vm: await loadSimulatorViewModel(event) });
