/**
 * CopyCraft — Date & Timestamp Formatting Utilities
 * -------------------------------------------------
 * Provides uniform, human-readable date and time formatting across all roles
 * (Customer, Dealer, Distributor, Admin).
 *
 * Guaranteed Behaviors:
 *  - Displays canonical creation date & time: e.g. "23 Oct 2026, 7:45 PM".
 *  - Uses original creation timestamp (order.createdAt or original timeline creation event).
 *  - Never fabricates timestamps (does NOT use Date.now() or delivery timestamps).
 *  - Gracefully handles missing, undefined, or invalid dates without ever rendering "Invalid Date" or throwing.
 */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format an order's original creation timestamp into a consistent, readable format.
 *
 * @param {string|number|Date|object} orderOrDate - Order object or ISO timestamp
 * @param {object} [options]
 * @param {string} [options.fallback=''] - String to return if timestamp is missing or invalid
 * @returns {string} Formatted string, e.g. "23 Oct 2026, 7:45 PM", or fallback
 */
export function formatOrderDate(orderOrDate, options = {}) {
  const fallback = options.fallback !== undefined ? options.fallback : '';
  if (!orderOrDate) return fallback;

  let rawDate = orderOrDate;

  // If passed an order object, resolve the canonical creation timestamp
  if (typeof orderOrDate === 'object' && !(orderOrDate instanceof Date)) {
    if (orderOrDate.createdAt) {
      rawDate = orderOrDate.createdAt;
    } else if (Array.isArray(orderOrDate.timeline)) {
      const createdTimeline = orderOrDate.timeline.find(
        t => t && (t.status === 'CREATED' || t.status === 'PENDING')
      );
      rawDate = createdTimeline?.time || orderOrDate.timeline[0]?.time;
    } else {
      rawDate = null;
    }
  }

  if (!rawDate) return fallback;

  const dateObj = new Date(rawDate);
  if (isNaN(dateObj.getTime())) {
    return fallback;
  }

  try {
    const day = dateObj.getDate();
    const month = MONTH_NAMES[dateObj.getMonth()];
    const year = dateObj.getFullYear();

    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12

    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  } catch (_) {
    return fallback;
  }
}
