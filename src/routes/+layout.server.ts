import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const auth = locals.session.auth;
	return {
		locale: locals.locale,
		user: auth ? { id: auth.userId, username: auth.username, email: auth.email } : null
	};
};
