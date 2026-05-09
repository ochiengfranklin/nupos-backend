// Generates a unique, human-readable receipt number
// Format: POS-{SHOPCODE}-{DATE}-{RANDOM}
// Example: POS-KAM-20260508-A3F9
// This is what the cashier prints and gives the customer

export const generateReceiptNumber = (shopSlug: string): string => {
    const shopCode = shopSlug.slice(0, 3).toUpperCase()
    const date     = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const random   = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `POS-${shopCode}-${date}-${random}`
}