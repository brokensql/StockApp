import { SaleTransaction } from '../types';

/**
 * Generates the next sequential, collision-free Receipt ID starting from "SA-01", "SA-02", etc.
 */
export function getNextReceiptId(existingSales: SaleTransaction[] = []): string {
  let maxSeq = 0;

  if (Array.isArray(existingSales)) {
    for (const s of existingSales) {
      if (!s) continue;
      const txNum = s.transactionNumber || s.id || '';
      const match = txNum.match(/SA-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  // Check persistent sequence tracking in localStorage if available
  try {
    const stored = localStorage.getItem('store_last_receipt_seq');
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  } catch {
    // ignore
  }

  // If existing sales exist but none had SA- format, use existingSales.length as base
  if (maxSeq === 0 && existingSales && existingSales.length > 0) {
    maxSeq = existingSales.length;
  }

  const nextSeq = maxSeq + 1;

  try {
    localStorage.setItem('store_last_receipt_seq', String(nextSeq));
  } catch {
    // ignore
  }

  return `SA-${String(nextSeq).padStart(2, '0')}`;
}
