/**
 * Format seconds into a human-readable minutes string.
 * e.g. 540 → "9 min" | 3780 → "1 hr 3 min"
 */
export function formatMinutes(secs: number): string {
  if (secs < 0) secs = 0;
  const totalMinutes = Math.ceil(secs / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

/**
 * Alias of formatMinutes — formats ETA from seconds to readable string.
 */
export function formatETA(secs: number): string {
  return formatMinutes(secs);
}

/**
 * Format a Date as HH:MM:SS (24-hour).
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Format a Date as DD/MM/YYYY.
 */
export function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Returns the ticket number string, left-padding the numeric portion if needed.
 * e.g. "B-3" → "B-03" (pads to 2 digits), "B-14" → "B-14"
 */
export function formatTicketNumber(num: string): string {
  // Match an optional letter prefix + dash/separator + numeric portion
  const match = num.match(/^([A-Za-z]+-?)(\d+)$/);
  if (!match) return num;
  const [, prefix, digits] = match;
  return `${prefix}${digits.padStart(2, '0')}`;
}

/**
 * Format total seconds as MM:SS string.
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
