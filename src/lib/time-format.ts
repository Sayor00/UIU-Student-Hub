/**
 * Formats a time string (HH:mm, 24h) into either 12h (e.g. "2:30 PM") or 24h (e.g. "14:30") format.
 * Returns the original string if it can't be parsed.
 */
export function formatTime(time: string | undefined, use12h: boolean = true): string {
    if (!time) return "";
    const parts = time.split(":");
    if (parts.length < 2) return time;
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1].padStart(2, "0");
    if (isNaN(hours)) return time;

    if (use12h) {
        const period = hours >= 12 ? "PM" : "AM";
        const h12 = hours % 12 === 0 ? 12 : hours % 12;
        return `${h12}:${minutes} ${period}`;
    } else {
        return `${hours.toString().padStart(2, "0")}:${minutes}`;
    }
}
