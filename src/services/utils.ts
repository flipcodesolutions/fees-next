export const formatDate = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Formats a date specifically for CSV exports to prevent Excel from auto-converting
 * dates (e.g. converting 02-10-2026 to 2/10/2026 or failing on 24-08-2026).
 * Using ="DD-MM-YYYY" forces Excel to treat it strictly as text.
 */
export const formatCsvDate = (dateInput: string | Date | undefined | null, fallback = '-'): string => {
  const formatted = formatDate(dateInput);
  if (!formatted || formatted === '-') return `"${fallback}"`;
  return `"=""${formatted}"""`;
};

