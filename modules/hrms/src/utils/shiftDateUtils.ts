const PKT_TIMEZONE = 'Asia/Karachi';

export function getPKTComponents(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PKT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '0';

  return {
    year: Number(pick('year')),
    month: Number(pick('month')),
    day: Number(pick('day')),
    hour: Number(pick('hour')),
    minute: Number(pick('minute')),
    second: Number(pick('second')),
  };
}

export function parseShiftHour(timeStr?: string): number {
  if (!timeStr) return 0;
  const [h] = String(timeStr).split(':');
  return parseInt(h, 10) || 0;
}

function subtractOneDay(year: number, month: number, day: number) {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() - 1);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function formatDateParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** 
 * Business Date Resolver for overnight shifts (e.g. 5:45 PM – 3:00 AM).
 * Must match backend dateUtils.js logic.
 * Any time from 12 AM to 4 AM is treated as the previous day's business date.
 */
export function getShiftDate(
  date: Date = new Date(),
  shiftEndHour = 4,
  shiftStartHour = 17
): string {
  const { year, month, day, hour } = getPKTComponents(date);

  if (hour < 4) {
    const prev = subtractOneDay(year, month, day);
    return formatDateParts(prev.year, prev.month, prev.day);
  }

  return formatDateParts(year, month, day);
}
