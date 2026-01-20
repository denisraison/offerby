export const formatCurrency = (cents: number): string =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0
  }).format(cents / 100)

export const dollarsToCents = (dollars: number): number =>
  Math.round(dollars * 100)

export const centsToDollars = (cents: number): number =>
  cents / 100
