import type { RequestHandler } from '@sveltejs/kit';
import { passkeyBegin } from '#lib/features/auth-onboarding/passkey.server.js';

// POST /auth/passkey/begin
export const POST: RequestHandler = (event) => passkeyBegin(event);
