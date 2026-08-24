/**
 * Helper to get the first and last day of the current month formatted as YYYY-MM-DD (local time).
 */
export const getCurrentMonthDateRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const formatYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const startDate = formatYMD(firstDay);
  const endDate = formatYMD(lastDay);

  return {
    startDate,
    endDate,
    fromDate: startDate,
    toDate: endDate,
  };
};
