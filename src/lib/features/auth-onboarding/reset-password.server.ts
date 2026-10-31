// auth.go ResetPasswordSubmit / ResetPasswordResend → renderResetResult(success, error).
import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { apiErrorMessage, emailPattern } from './auth.server.js';

export type ResetResult = { success: string; error: string };
const ok = (success: string): ResetResult => ({ success, error: '' });
const bad = (error: string): ResetResult => ({ success: '', error });

export async function resetPasswordSubmit(event: RequestEvent): Promise<ResetResult> {
	const form = await event.request.formData().catch(() => null);
	if (!form) return bad('Invalid form submission.');
	const email = String(form.get('email') ?? '').trim();
	const code = String(form.get('code') ?? '').trim();
	const newPassword = String(form.get('new_password') ?? '');
	if (!emailPattern.test(email)) return bad('Enter a valid email address.');
	if (code === '' || new TextEncoder().encode(newPassword).length < 8) {
		return bad('Enter the reset code and a password of at least 8 characters.');
	}
	try {
		await apiJSON(
			event,
			'POST',
			'/v1/auth/reset-password',
			{ email, code, newPassword },
			{ auth: 'none' }
		);
	} catch (err) {
		if (isAPIError(err)) return bad('Invalid or expired reset code.');
		console.error('reset password', err);
		return bad('Could not reset password. Please try again.');
	}
	return ok('Password updated. You can sign in with your new password.');
}

export async function resetPasswordResend(event: RequestEvent): Promise<ResetResult> {
	const form = await event.request.formData().catch(() => null);
	if (!form) return bad('Invalid form submission.');
	const email = String(form.get('email') ?? '').trim();
	if (!emailPattern.test(email))
		return bad('Enter a valid email address to resend your reset code.');
	let message = 'If an account exists for that email, we sent a new reset code.';
	try {
		const res = await apiJSON<{ message?: string } | undefined>(
			event,
			'POST',
			'/v1/auth/resend-reset',
			{ email },
			{ auth: 'none' }
		);
		if (res?.message) message = res.message;
	} catch (err) {
		if (isAPIError(err))
			return bad(apiErrorMessage(err, 'Could not resend reset email. Please try again.'));
		console.error('resend reset password', err);
		return bad('Could not resend reset email. Please try again.');
	}
	return ok(message);
}
