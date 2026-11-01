// Date calendaristice ca text „YYYY-MM-DD”. Calculele se fac în UTC, ca să nu depindă de fusul orar.

export const WEEKDAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
export const WEEKDAYS_SHORT = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'];
export const MONTHS = [
	'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
	'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'
];
export const MONTHS_SHORT = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(s: unknown): s is string {
	if (typeof s !== 'string') return false;
	const m = s.match(ISO);
	if (!m) return false;
	const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
	return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function toDate(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}

function fromDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
	const d = toDate(iso);
	d.setUTCDate(d.getUTCDate() + days);
	return fromDate(d);
}

/** 0 = luni … 6 = duminică */
export function weekdayIndex(iso: string): number {
	return (toDate(iso).getUTCDay() + 6) % 7;
}

export function startOfWeek(iso: string): string {
	return addDays(iso, -weekdayIndex(iso));
}

export function weekDays(monday: string): string[] {
	return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function daysBetween(from: string, to: string): number {
	return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
}

/** Data de azi în fusul orar dat (implicit Europe/Chisinau). */
export function today(timeZone = 'Europe/Chisinau'): string {
	const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
	return parts; // en-CA dă deja YYYY-MM-DD
}

export function monthKey(iso: string): string {
	return iso.slice(0, 7);
}

export function isMonthKey(s: unknown): s is string {
	return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function addMonths(month: string, n: number): string {
	const [y, m] = month.split('-').map(Number);
	const d = new Date(Date.UTC(y, m - 1 + n, 1));
	return fromDate(d).slice(0, 7);
}

/** Grila lunii, începând cu luni; zilele din afara lunii sunt null. */
export function monthGrid(month: string): (string | null)[] {
	const first = `${month}-01`;
	const lead = weekdayIndex(first);
	const [y, m] = month.split('-').map(Number);
	const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
	const cells: (string | null)[] = Array(lead).fill(null);
	for (let i = 1; i <= days; i++) cells.push(`${month}-${String(i).padStart(2, '0')}`);
	while (cells.length % 7) cells.push(null);
	return cells;
}

export function dayNumber(iso: string): number {
	return Number(iso.slice(8, 10));
}

export function formatDayLong(iso: string): string {
	const d = toDate(iso);
	return `${WEEKDAYS[weekdayIndex(iso)]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function formatDayShort(iso: string): string {
	const d = toDate(iso);
	return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

export function formatMonth(month: string): string {
	const [y, m] = month.split('-').map(Number);
	const name = MONTHS[m - 1];
	return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

export function formatRange(from: string, to: string): string {
	const a = toDate(from);
	const b = toDate(to);
	if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
		return `${a.getUTCDate()} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
	}
	return `${a.getUTCDate()} ${MONTHS_SHORT[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS_SHORT[b.getUTCMonth()]}`;
}

export function isTime(s: unknown): s is string {
	return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}
