/**
 * Utilidades de formateo para el parser
 */

export function formatCurrency(amount: number, currencySymbol: string = '$'): string {
  return `${currencySymbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function normalizeNumber(num: string | number): string {
  const str = typeof num === 'number' ? num.toString() : num;
  return str.padStart(2, '0');
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }
}

export function formatNumbersList(numbers: string[], maxDisplay: number = 10): string {
  if (numbers.length <= maxDisplay) {
    return numbers.join(', ');
  }
  
  const displayed = numbers.slice(0, maxDisplay);
  const remaining = numbers.length - maxDisplay;
  return `${displayed.join(', ')} ... y ${remaining} más`;
}

export function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}