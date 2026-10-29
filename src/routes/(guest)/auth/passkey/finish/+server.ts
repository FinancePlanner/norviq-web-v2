import type { RequestHandler } from '@sveltejs/kit';
import { passkeyFinish } from '#lib/features/auth-onboarding/passkey.server.js';

// POST /auth/passkey/finish
export const POST: RequestHandler = (event) => passkeyFinish(event);
