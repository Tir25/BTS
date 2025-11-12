/**
 * Formats shift label from name, start time, and end time
 * @param name - Shift name (optional)
 * @param start - Shift start time (optional)
 * @param end - Shift end time (optional)
 * @returns Formatted shift label string or null
 */
export const formatShiftLabel = (
  name?: string | null,
  start?: string | null,
  end?: string | null
): string | null => {
  if (!name && !start && !end) return null;
  const normalizeTime = (time?: string | null) => {
    if (!time) return null;
    return time.length >= 5 ? time.slice(0, 5) : time;
  };
  const startFormatted = normalizeTime(start);
  const endFormatted = normalizeTime(end);
  if (startFormatted && endFormatted) {
    return name ? `${name} (${startFormatted} - ${endFormatted})` : `${startFormatted} - ${endFormatted}`;
  }
  if (name) return name;
  if (startFormatted || endFormatted) {
    return [startFormatted, endFormatted].filter(Boolean).join(' - ') || null;
  }
  return null;
};

