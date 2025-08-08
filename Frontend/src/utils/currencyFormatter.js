/**
 * Utility function to format currency in Mexican peso format
 * @param {number} amount - The amount to format
 * @param {Object} options - Additional formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, options = {}) => {
  const defaultOptions = {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  };

  try {
    return new Intl.NumberFormat('es-MX', defaultOptions).format(amount || 0);
  } catch (error) {
    // Fallback to basic formatting if Intl is not supported
    return `$${(amount || 0).toLocaleString('es-MX')}`;
  }
};

/**
 * Format currency for display without the currency symbol (just the number)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted number string
 */
export const formatAmount = (amount) => {
  try {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount || 0);
  } catch (error) {
    return (amount || 0).toLocaleString('es-MX');
  }
}; 