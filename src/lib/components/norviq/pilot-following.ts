/** components.PilotFollowingVM */
export interface PilotFollowingVM {
	pilotName: string;
	followHref: string;
	paused?: boolean;
}

/** components.PilotFollowingFor — lookup keyed by lower-cased, trimmed portfolio id. */
export function pilotFollowingFor(
	m: Record<string, PilotFollowingVM> | null | undefined,
	portfolioID: string
): PilotFollowingVM | undefined {
	return m?.[portfolioID.trim().toLowerCase()];
}
