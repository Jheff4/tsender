export function calculateTotal(amounts: string): number {
  if (!amounts.trim()) return 0

  const amountArray = amounts
    .split(/[,\n]+/)
    .map(amt => amt.trim())
    .filter(Boolean)
    .map(Number)

  if (amountArray.some(Number.isNaN)) {
    return 0
  }

  return amountArray.reduce((acc, curr) => acc + curr, 0)
}
