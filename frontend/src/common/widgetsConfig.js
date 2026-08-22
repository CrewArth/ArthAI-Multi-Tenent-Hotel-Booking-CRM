/**
 * Centralized Widget Configuration
 *
 * Defines metadata for each summary stat card widget.
 * Adding a new stat card widget only requires adding an entry here.
 */

export const WIDGETS = [
  {
    id: "totalBookings",
    name: "Total Bookings",
    description: "Stat card showing the total number of bookings.",
    defaultEnabled: true,
  },
  {
    id: "totalUsers",
    name: "Total Admins",
    description: "Stat card showing the total number of admin accounts.",
    defaultEnabled: true,
  },
  {
    id: "totalGuestHouses",
    name: "Hotels",
    description: "Stat card showing total hotel properties.",
    defaultEnabled: true,
  },
  {
    id: "cancelledBookings",
    name: "Cancelled",
    description: "Stat card showing count of cancelled bookings.",
    defaultEnabled: true,
  },
  {
    id: "pendingBookings",
    name: "Pending",
    description: "Stat card showing count of pending booking requests.",
    defaultEnabled: true,
  },
  {
    id: "approvedBookings",
    name: "Approved",
    description: "Stat card showing count of approved bookings.",
    defaultEnabled: true,
  },
  {
    id: "occupancyRate",
    name: "Occupancy Rate",
    description: "Stat card showing current hotel occupancy percentage.",
    defaultEnabled: true,
  },
  {
    id: "todaysBookings",
    name: "Today's Bookings",
    description: "Stat card showing count of bookings scheduled for today.",
    defaultEnabled: true,
  },
];

/**
 * Returns all widget IDs.
 */
export const getAllWidgetIds = () => WIDGETS.map((w) => w.id);

/**
 * Checks if a user has permission to view a specific stat card widget.
 * - SUPER_ADMIN has access to all widgets.
 * - If user's `allowedWidgets` is null/undefined, all stat cards are enabled by default.
 * - Otherwise, checks if `widgetId` is included in the user's `allowedWidgets` array.
 */
export const isWidgetAllowed = (user, widgetId) => {
  if (!user) return true;
  
  const userRole = String(user.role || '').toUpperCase();
  if (userRole === 'SUPER_ADMIN') {
    return true;
  } 

  const allowed = user.allowedWidgets;
  if (allowed === null || allowed === undefined) {
    return true; // Default full access if unassigned
  }

  if (Array.isArray(allowed)) {
    return allowed.includes(widgetId);
  }

  return false;
};
