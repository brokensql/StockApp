/**
 * Philippine Date & Timezone Utilities (PST/PHT, UTC+8, Asia/Manila)
 * Ensures all transactions, chart timeframes, date grouping, and relative
 * growth indicators are computed strictly against the Philippines timezone.
 */

import { SaleTransaction } from '../types';

export const PHILIPPINES_TIMEZONE = 'Asia/Manila';

export interface PHTDateParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  dateKey: string; // YYYY-MM-DD in PHT
}

/**
 * Returns year, month, day, hour, minute, and YYYY-MM-DD dateKey
 * strictly evaluated in the Philippine Timezone (Asia/Manila, UTC+8).
 */
export function getPHTParts(dateInput: Date | number | string = new Date()): PHTDateParts {
  const d = typeof dateInput === 'number' || typeof dateInput === 'string'
    ? new Date(dateInput)
    : dateInput;
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PHILIPPINES_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(validDate);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year || '2026', 10);
  const month = parseInt(map.month || '1', 10);
  const day = parseInt(map.day || '1', 10);
  const hour = parseInt(map.hour || '0', 10);
  const minute = parseInt(map.minute || '0', 10);

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const dateKey = `${year}-${mm}-${dd}`;

  return { year, month, day, hour, minute, dateKey };
}

/**
 * Returns UTC millisecond timestamp representing midnight (00:00:00)
 * of the current day in Philippine Time (UTC+8).
 */
export function getPHTTodayMidnightEpoch(): number {
  const parts = getPHTParts(new Date());
  // Midnight in PHT is (Date.UTC(y, m-1, d, 0, 0, 0) - 8 hours)
  return Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0) - 8 * 60 * 60 * 1000;
}

/**
 * Safely extracts the transaction epoch millisecond timestamp.
 */
export function getTransactionTimestamp(tx: SaleTransaction): number {
  if (tx.createdAt && typeof tx.createdAt === 'number' && !isNaN(tx.createdAt)) {
    return tx.createdAt;
  }

  const match = tx.id.match(/^tx-(\d{10,14})$/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 1000000000) {
      return num;
    }
  }

  if (tx.timestamp) {
    if (tx.timestamp.startsWith('Today')) {
      return Date.now();
    }
    if (tx.timestamp.startsWith('Yesterday')) {
      return Date.now() - 24 * 60 * 60 * 1000;
    }
    const parsed = Date.parse(tx.timestamp);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  return Date.now();
}

/**
 * Formats a transaction time into Philippine Time format.
 * E.g. "Today, 3:45 PM", "Yesterday, 10:15 AM", or "Sep 3, 2026, 2:30 PM"
 */
export function formatPHTTimestamp(dateInput: Date | number | string): string {
  const d = typeof dateInput === 'number' || typeof dateInput === 'string'
    ? new Date(dateInput)
    : dateInput;
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const todayParts = getPHTParts(new Date());
  const txParts = getPHTParts(validDate);

  const midnightToday = getPHTTodayMidnightEpoch();
  const midnightYesterday = midnightToday - 24 * 60 * 60 * 1000;
  const yesterdayParts = getPHTParts(midnightYesterday + 1000);

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PHILIPPINES_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const timeStr = timeFormatter.format(validDate);

  if (txParts.dateKey === todayParts.dateKey) {
    return `Today, ${timeStr}`;
  } else if (txParts.dateKey === yesterdayParts.dateKey) {
    return `Yesterday, ${timeStr}`;
  } else {
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: PHILIPPINES_TIMEZONE,
      month: 'short',
      day: 'numeric',
      year: txParts.year !== todayParts.year ? 'numeric' : undefined,
    });
    return `${dateFormatter.format(validDate)}, ${timeStr}`;
  }
}

export interface SalesGrowthMetrics {
  todayTotal: number;
  yesterdayTotal: number;
  changeAmount: number;
  changePercentage: number;
  isPositive: boolean;
  hasSalesToday: boolean;
  hasSalesYesterday: boolean;
  todayCount: number;
  yesterdayCount: number;
}

/**
 * Calculates genuine sales growth comparing Today (PHT) vs Yesterday (PHT)
 * strictly derived from the store's recorded transactions.
 */
export function calculatePHTSalesGrowth(sales: SaleTransaction[]): SalesGrowthMetrics {
  const todayParts = getPHTParts(new Date());
  const midnightToday = getPHTTodayMidnightEpoch();
  const yesterdayParts = getPHTParts(midnightToday - 12 * 3600 * 1000);

  let todayTotal = 0;
  let todayCount = 0;
  let yesterdayTotal = 0;
  let yesterdayCount = 0;

  for (const s of sales) {
    const epoch = getTransactionTimestamp(s);
    const p = getPHTParts(epoch);
    if (p.dateKey === todayParts.dateKey) {
      todayTotal += s.total;
      todayCount += 1;
    } else if (p.dateKey === yesterdayParts.dateKey) {
      yesterdayTotal += s.total;
      yesterdayCount += 1;
    }
  }

  const diff = todayTotal - yesterdayTotal;
  const changeAmount = Math.abs(diff);
  const isPositive = diff >= 0;

  let changePercentage = 0;
  if (yesterdayTotal > 0) {
    changePercentage = Math.round((Math.abs(diff) / yesterdayTotal) * 1000) / 10;
  } else if (todayTotal > 0) {
    changePercentage = 100.0;
  } else {
    changePercentage = 0.0;
  }

  return {
    todayTotal,
    yesterdayTotal,
    changeAmount,
    changePercentage,
    isPositive,
    hasSalesToday: todayTotal > 0,
    hasSalesYesterday: yesterdayTotal > 0,
    todayCount,
    yesterdayCount,
  };
}

export interface ChartDataPoint {
  label: string;
  fullDate: string;
  dateKey: string;
  value: number;
}

/**
 * Dynamically aggregates transactions into chart data points for 7d, 30d, or 90d
 * based on Philippine calendar days (Asia/Manila).
 */
export function generatePHTChartDataset(
  sales: SaleTransaction[],
  timeframe: '7d' | '30d' | '90d'
): { points: ChartDataPoint[]; total: number } {
  // Aggregate sales by Philippine dateKey (YYYY-MM-DD)
  const salesByDate: Record<string, number> = {};
  for (const s of sales) {
    const epoch = getTransactionTimestamp(s);
    const dateKey = getPHTParts(epoch).dateKey;
    salesByDate[dateKey] = (salesByDate[dateKey] || 0) + s.total;
  }

  const phtMidnight = getPHTTodayMidnightEpoch();
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PHILIPPINES_TIMEZONE,
    weekday: 'short',
  });
  const monthDayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PHILIPPINES_TIMEZONE,
    month: 'short',
    day: 'numeric',
  });
  const fullFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PHILIPPINES_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const points: ChartDataPoint[] = [];
  let total = 0;

  if (timeframe === '7d') {
    // 7 consecutive days ending today
    for (let i = 6; i >= 0; i--) {
      const epoch = phtMidnight - (i * 24 - 12) * 3600 * 1000;
      const targetDate = new Date(epoch);
      const parts = getPHTParts(epoch);
      const val = salesByDate[parts.dateKey] || 0;
      total += val;

      const isToday = i === 0;
      const label = isToday ? 'Today' : dayFormatter.format(targetDate);
      const fullDate = isToday
        ? `Today (${fullFormatter.format(targetDate)})`
        : fullFormatter.format(targetDate);

      points.push({
        label,
        fullDate,
        dateKey: parts.dateKey,
        value: val,
      });
    }
  } else if (timeframe === '30d') {
    // 30 consecutive days ending today
    for (let i = 29; i >= 0; i--) {
      const epoch = phtMidnight - (i * 24 - 12) * 3600 * 1000;
      const targetDate = new Date(epoch);
      const parts = getPHTParts(epoch);
      const val = salesByDate[parts.dateKey] || 0;
      total += val;

      const label = monthDayFormatter.format(targetDate);
      const fullDate = fullFormatter.format(targetDate);

      points.push({
        label,
        fullDate,
        dateKey: parts.dateKey,
        value: val,
      });
    }
  } else {
    // 90d: 13 weekly points ending today
    for (let week = 12; week >= 0; week--) {
      let weekVal = 0;
      let representativeDate = new Date();
      let lastParts = getPHTParts(new Date());

      for (let day = 6; day >= 0; day--) {
        const dayIndex = week * 7 + day;
        const epoch = phtMidnight - (dayIndex * 24 - 12) * 3600 * 1000;
        const parts = getPHTParts(epoch);
        const dayVal = salesByDate[parts.dateKey] || 0;
        weekVal += dayVal;
        total += dayVal;
        if (day === 0) {
          representativeDate = new Date(epoch);
          lastParts = parts;
        }
      }

      points.push({
        label: monthDayFormatter.format(representativeDate),
        fullDate: `Week ending ${fullFormatter.format(representativeDate)}`,
        dateKey: lastParts.dateKey,
        value: weekVal,
      });
    }
  }

  return { points, total };
}
