// Shapes shared by the auth/onboarding server code and components.

/** What the MFA modal renders: MFAModal(maskedDestination, resendAvailableIn, error, info). */
export interface MFAModalState {
	maskedDestination: string;
	resendAvailableIn: number;
	error: string;
	info: string;
}

export const emptyMFAState = (): MFAModalState => ({
	maskedDestination: '',
	resendAvailableIn: 0,
	error: '',
	info: ''
});
