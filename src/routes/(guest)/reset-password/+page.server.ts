import type { Actions } from './$types';
import { resetPasswordSubmit } from '#lib/features/auth-onboarding/reset-password.server.js';

export const actions: Actions = { default: resetPasswordSubmit };
