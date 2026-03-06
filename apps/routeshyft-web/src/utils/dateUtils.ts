/**
 * Date utility functions to prevent timezone-related bugs
 *
 * IMPORTANT: Always use these functions when working with month strings (YYYY-MM)
 * to avoid timezone offset issues that can cause month boundaries to shift.
 */

/**
 * Parse a month string (YYYY-MM) and return the first and last day as UTC Date objects
 *
 * @param monthStr - Month string in format "YYYY-MM" (e.g., "2025-12")
 * @returns Object with startDate and endDate as UTC Date objects
 *
 * @example
 * const { startDate, endDate } = getMonthDateRange("2025-12");
 * // startDate = 2025-12-01T00:00:00.000Z
 * // endDate = 2025-12-31T23:59:59.999Z
 */
export function getMonthDateRange(monthStr: string): { startDate: Date; endDate: Date } {
  const [year, month] = monthStr.split('-');
  const monthNum = parseInt(month) - 1; // Convert to 0-based month
  const yearNum = parseInt(year);

  // Use UTC to avoid timezone issues
  const startDate = new Date(Date.UTC(yearNum, monthNum, 1));
  const endDate = new Date(Date.UTC(yearNum, monthNum + 1, 0, 23, 59, 59, 999));

  return { startDate, endDate };
}

/**
 * Format a month Date range as ISO date strings (YYYY-MM-DD) for API calls
 *
 * @param monthStr - Month string in format "YYYY-MM" (e.g., "2025-12")
 * @returns Object with startDateStr and endDateStr as "YYYY-MM-DD" strings
 *
 * @example
 * const { startDateStr, endDateStr } = getMonthDateStrings("2025-12");
 * // startDateStr = "2025-12-01"
 * // endDateStr = "2025-12-31"
 *
 * // Use in API calls:
 * api.get(`/transactions?start_date=${startDateStr}&end_date=${endDateStr}`);
 */
export function getMonthDateStrings(monthStr: string): { startDateStr: string; endDateStr: string } {
  const { startDate, endDate } = getMonthDateRange(monthStr);

  // Format as ISO date strings (YYYY-MM-DD)
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  return { startDateStr, endDateStr };
}

/**
 * Get the current month in YYYY-MM format using local timezone
 *
 * @returns Current month string (e.g., "2025-12")
 */
export function getCurrentMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Add or subtract months from a month string
 *
 * @param monthStr - Month string in format "YYYY-MM"
 * @param delta - Number of months to add (positive) or subtract (negative)
 * @returns New month string in format "YYYY-MM"
 *
 * @example
 * addMonths("2025-12", 1)  // "2026-01"
 * addMonths("2025-01", -1) // "2024-12"
 */
export function addMonths(monthStr: string, delta: number): string {
  const [year, month] = monthStr.split('-').map(Number);
  let newYear = year;
  let newMonth = month + delta;

  // Handle month overflow/underflow
  while (newMonth > 12) {
    newMonth -= 12;
    newYear += 1;
  }

  while (newMonth < 1) {
    newMonth += 12;
    newYear -= 1;
  }

  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}


/**
 * Format a month string for display
 *
 * @param monthStr - Month string in format "YYYY-MM"
 * @returns Formatted string like "December 2025"
 */
export function formatMonthDisplay(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

/**
 * Format a date string (YYYY-MM-DD or ISO) for display, interpreting it as a UTC date
 * to prevent timezone shifts (e.g. showing "Jan 28" for "2026-01-29").
 * 
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions (defaults to short month, numeric day/year)
 */
export function formatDate(date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  // Default options if not provided
  const formatOptions: Intl.DateTimeFormatOptions = options || {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };

  // Force UTC timezone to prevent off-by-one errors
  return d.toLocaleDateString('en-US', {
    ...formatOptions,
    timeZone: 'UTC'
  });
}
