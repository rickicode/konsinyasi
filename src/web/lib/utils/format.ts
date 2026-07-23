const LOCALE = 'id-ID';
const CURRENCY = 'IDR';

const defaultDateOptions: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

const defaultTimeOptions: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

export function toDate(value: string | Date | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Format a date as an Indonesian short date (e.g. "15 Jan 2025").
 */
export function formatDate(
  value: string | Date | number,
  options: Intl.DateTimeFormatOptions = defaultDateOptions
): string {
  return new Intl.DateTimeFormat(LOCALE, options).format(toDate(value));
}

/**
 * Format a date and time as an Indonesian short datetime (e.g. "15 Jan 2025, 14.30").
 */
export function formatDateTime(
  value: string | Date | number,
  options: Intl.DateTimeFormatOptions = defaultTimeOptions
): string {
  return new Intl.DateTimeFormat(LOCALE, options).format(toDate(value));
}

/**
 * Format an integer amount as Indonesian Rupiah.
 * Accepts `number`, `bigint`, or a numeric string.
 */
export function formatRupiah(amount: number | bigint | string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a distance in meters as a human-readable string.
 * ≥ 1000 m is shown in kilometres; otherwise in metres.
 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '-';
  if (meters >= 1000) {
    return `${(meters / 1000).toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format a relative time description (e.g. "2 jam yang lalu").
 */
export function formatTimeAgo(value: string | Date | number): string {
  const date = toDate(value);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  if (Math.abs(diffSeconds) < minute) return rtf.format(-diffSeconds, 'second');
  if (Math.abs(diffSeconds) < hour) return rtf.format(-Math.floor(diffSeconds / minute), 'minute');
  if (Math.abs(diffSeconds) < day) return rtf.format(-Math.floor(diffSeconds / hour), 'hour');
  if (Math.abs(diffSeconds) < week) return rtf.format(-Math.floor(diffSeconds / day), 'day');
  if (Math.abs(diffSeconds) < month) return rtf.format(-Math.floor(diffSeconds / week), 'week');
  if (Math.abs(diffSeconds) < year) return rtf.format(-Math.floor(diffSeconds / month), 'month');
  return rtf.format(-Math.floor(diffSeconds / year), 'year');
}
