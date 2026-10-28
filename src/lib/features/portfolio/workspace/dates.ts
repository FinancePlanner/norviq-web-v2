// The two Go time layouts these handlers use, on the server's clock (Go used
// time.Now() in the pod's zone, UTC; a Worker is UTC too).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function goTimeFormat(t: Date, layout: '2 Jan 2006' | '2006-01-02'): string {
	const y = t.getFullYear();
	const m = t.getMonth();
	const d = t.getDate();
	if (layout === '2 Jan 2006') return `${d} ${MONTHS[m]} ${y}`;
	return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
