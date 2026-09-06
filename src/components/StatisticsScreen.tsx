import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  BarChart2,
  Calendar,
  ShoppingBag,
  DollarSign,
  Package,
  Award,
  Medal,
  Gem,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  ArrowUpRight,
} from 'lucide-react';
import { Product, SaleTransaction } from '../types';
import { getTransactionTimestamp, formatPHTTimestamp } from '../utils/philippineDate';
import { RevenueStatisticsChart, RevenueTimeframe } from './RevenueStatisticsChart';
import { CategoryDonutChart } from './CategoryDonutChart';
import { getProductColor } from '../utils/productColors';

interface StatisticsScreenProps {
  products: Product[];
  sales: SaleTransaction[];
  onNavigateToStore?: (subTab?: 'inventory' | 'sales') => void;
}

export const StatisticsScreen: React.FC<StatisticsScreenProps> = ({
  products = [],
  sales = [],
  onNavigateToStore,
}) => {
  const [timeframe, setTimeframe] = useState<RevenueTimeframe>('week');

  // Filter sales based on selected timeframe in Philippine Time
  const filteredSales = useMemo(() => {
    if (sales.length === 0) return [];

    const now = new Date();
    // UTC+8 offset calculation
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const phtNow = new Date(utcTime + 8 * 3600000);

    const startOfToday = new Date(phtNow);
    startOfToday.setHours(0, 0, 0, 0);

    return sales.filter((s) => {
      const txTimestamp = getTransactionTimestamp(s);
      const txPht = new Date(txTimestamp + 8 * 3600000);

      if (timeframe === 'day') {
        return txPht >= startOfToday;
      }

      if (timeframe === 'week') {
        const sevenDaysAgo = new Date(startOfToday);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        return txPht >= sevenDaysAgo;
      }

      if (timeframe === 'month') {
        const startOfMonth = new Date(phtNow.getFullYear(), phtNow.getMonth(), 1);
        return txPht >= startOfMonth;
      }

      if (timeframe === 'year') {
        const startOfYear = new Date(phtNow.getFullYear(), 0, 1);
        return txPht >= startOfYear;
      }

      return true;
    });
  }, [sales, timeframe]);

  // Aggregate Metrics
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
  }, [filteredSales]);

  const totalTransactionsCount = filteredSales.length;

  const totalItemsSold = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      if (s.items && s.items.length > 0) {
        return acc + s.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      }
      return acc + (s.itemCount || 1);
    }, 0);
  }, [filteredSales]);

  const averageOrderValue = useMemo(() => {
    if (totalTransactionsCount === 0) return 0;
    return totalRevenue / totalTransactionsCount;
  }, [totalRevenue, totalTransactionsCount]);

  // Total Inventory Valuation (Potential retail revenue from current shelf stock)
  const totalInventoryValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + p.price * p.stock, 0);
  }, [products]);

  // Active days count in the selected period for the subtext
  const activeDaysInPeriod = useMemo(() => {
    if (timeframe === 'day') return 1;
    if (filteredSales.length === 0) return timeframe === 'week' ? 4 : 7;
    const daysSet = new Set(
      filteredSales.map((s) => {
        const ts = getTransactionTimestamp(s);
        const pht = new Date(ts + 8 * 3600000);
        return `${pht.getFullYear()}-${pht.getMonth() + 1}-${pht.getDate()}`;
      })
    );
    return Math.max(1, daysSet.size);
  }, [filteredSales, timeframe]);

  // Top Selling Products Leaderboard
  const topProducts = useMemo(() => {
    const productStats: Record<
      string,
      { id: string; name: string; category: string; quantity: number; revenue: number }
    > = {};

    filteredSales.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const key = item.productId || item.name;
          if (!productStats[key]) {
            productStats[key] = {
              id: key,
              name: item.name,
              category: item.category || 'General',
              quantity: 0,
              revenue: 0,
            };
          }
          productStats[key].quantity += item.quantity;
          productStats[key].revenue += item.unitPrice * item.quantity;
        });
      } else {
        const key = sale.primaryItemName;
        if (!productStats[key]) {
          productStats[key] = {
            id: key,
            name: sale.primaryItemName,
            category: 'General',
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[key].quantity += sale.itemCount;
        productStats[key].revenue += sale.total;
      }
    });

    return Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  // Sales by Category Breakdown
  const categoryStats = useMemo(() => {
    const categories: Record<string, { count: number; revenue: number }> = {};

    filteredSales.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const cat = item.category || 'General';
          if (!categories[cat]) {
            categories[cat] = { count: 0, revenue: 0 };
          }
          categories[cat].count += item.quantity;
          categories[cat].revenue += item.unitPrice * item.quantity;
        });
      } else {
        const cat = 'General';
        if (!categories[cat]) {
          categories[cat] = { count: 0, revenue: 0 };
        }
        categories[cat].count += sale.itemCount;
        categories[cat].revenue += sale.total;
      }
    });

    return Object.entries(categories)
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, totalRevenue]);

  // Stock Health
  const stockHealth = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => p.stock > p.lowStockThreshold).length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;

    const inStockPct = total > 0 ? Math.round((inStock / total) * 100) : 100;
    const lowStockPct = total > 0 ? Math.round((lowStock / total) * 100) : 0;
    const outOfStockPct = total > 0 ? Math.round((outOfStock / total) * 100) : 0;

    return { total, inStock, lowStock, outOfStock, inStockPct, lowStockPct, outOfStockPct };
  }, [products]);

  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <motion.div
      id="statistics-screen-view"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-full max-w-[430px] mx-auto px-5 pt-3.5 pb-28 sm:pb-32"
    >
      {/* Revenue & Sales Chart matching specified visual format */}
      <RevenueStatisticsChart
        sales={sales}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
      />

      {/* Synchronized Smooth Transition for KPI Metrics & Analytics */}
      <motion.div
        key={`stats-metrics-${timeframe}`}
        initial={{ opacity: 0.7, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {/* 2-Column Horizontal KPI Metrics (Total Revenue & Items Sold, resized) */}
        <section
          aria-label="Key Performance Indicators"
          className="grid grid-cols-2 divide-x divide-[#DEE3DE] py-5 mb-7 select-none"
        >
          {/* 1. Total Revenue */}
          <div className="flex flex-col items-center text-center px-3">
            <div className="w-11 h-11 rounded-full bg-[#EBF4EE] text-[#2E7D5B] flex items-center justify-center mb-2.5 flex-shrink-0">
              <TrendingUp size={20} strokeWidth={2.2} />
            </div>
            <span className="text-[13px] font-medium text-[#6E746F] leading-tight block truncate">
              Total Revenue
            </span>
            <span className="text-[18px] sm:text-[20px] font-bold text-[#252825] tabular-nums mt-1.5 block tracking-tight leading-none">
              {formatCurrency(totalRevenue)}
            </span>
            <span className="text-[11.5px] text-[#8F9690] mt-1.5 block leading-tight">
              {activeDaysInPeriod} {activeDaysInPeriod === 1 ? 'day' : 'days'} in period
            </span>
          </div>

          {/* 2. Items Sold */}
          <div className="flex flex-col items-center text-center px-3">
            <div className="w-11 h-11 rounded-full bg-[#EBF4EE] text-[#2E7D5B] flex items-center justify-center mb-2.5 flex-shrink-0">
              <Package size={20} strokeWidth={2.2} />
            </div>
            <span className="text-[13px] font-medium text-[#6E746F] leading-tight block truncate">
              Items Sold
            </span>
            <span className="text-[18px] sm:text-[20px] font-bold text-[#252825] tabular-nums mt-1.5 block tracking-tight leading-none">
              {totalItemsSold}
            </span>
            <span className="text-[11.5px] text-[#8F9690] mt-1.5 block leading-tight">
              {products.length} catalog products
            </span>
          </div>
        </section>

      {/* Top Selling Products Leaderboard */}
      <section aria-label="Top Products" className="mb-8">
        <div className="flex items-center justify-between mb-4 px-0.5">
          <h2 className="text-[17px] font-bold text-[#252825]">
            Top selling products
          </h2>
          {onNavigateToStore && (
            <button
              type="button"
              onClick={() => onNavigateToStore('inventory')}
              className="text-[13px] font-medium text-[#4F8065] hover:underline cursor-pointer"
            >
              View catalog →
            </button>
          )}
        </div>

        {topProducts.length === 0 ? (
          <div className="py-6 text-center text-[14px] text-[#6E746F]">
            No sales recorded for this timeframe yet.
          </div>
        ) : (
          <div className="space-y-4">
            {topProducts.map((prod) => {
              const maxRevenue = topProducts[0]?.revenue || 1;
              const fillPct = Math.max(8, (prod.revenue / maxRevenue) * 100);
              const prodColor = getProductColor(prod.id || prod.name, products);

              return (
                <div key={prod.name}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-xs"
                        style={{ backgroundColor: prodColor }}
                      >
                        <Gem size={17} strokeWidth={2.2} />
                      </div>
                      <span className="font-semibold text-[#252825] truncate text-[14.5px] sm:text-[15px]">
                        {prod.name}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0 tabular-nums">
                      <span className="font-semibold text-[#252825] text-[14.5px] sm:text-[15px] block leading-snug">
                        {formatCurrency(prod.revenue)}
                      </span>
                      <span className="text-[11.5px] text-[#8F9690] block mt-0.5 leading-tight">
                        {prod.quantity} sold
                      </span>
                    </div>
                  </div>
                  {/* Visual Progress Bar matching product color */}
                  <div className="w-full bg-[#F0F2F0] h-1.5 rounded-full overflow-hidden mt-2.5">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${fillPct}%`, backgroundColor: prodColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sales by Product Donut Chart (Top 5 product sales) */}
      <div className="mb-8">
        <CategoryDonutChart
          products={products}
          filteredSales={filteredSales}
          categories={categoryStats}
          totalRevenue={totalRevenue}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Inventory Health Section - container-less flat layout matching screenshot */}
      <section aria-label="Inventory Health" className="mb-6">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 className="text-[17px] font-bold text-[#252825]">
            Inventory health
          </h2>
          {onNavigateToStore && (
            <button
              type="button"
              onClick={() => onNavigateToStore('inventory')}
              className="text-[13px] font-medium text-[#4F8065] hover:underline cursor-pointer"
            >
              Manage stock →
            </button>
          )}
        </div>

        {/* Multi-segment bar directly on screen */}
        <div className="w-full bg-[#EBEFEA] h-2.5 sm:h-3 rounded-full overflow-hidden flex my-3.5">
          <div
            className="bg-[#4F8065] h-full transition-all"
            style={{ width: `${stockHealth.inStockPct}%` }}
            title={`In Stock: ${stockHealth.inStock}`}
          />
          <div
            className="bg-[#F5B853] h-full transition-all"
            style={{ width: `${stockHealth.lowStockPct}%` }}
            title={`Low Stock: ${stockHealth.lowStock}`}
          />
          <div
            className="bg-[#F06560] h-full transition-all"
            style={{ width: `${stockHealth.outOfStockPct}%` }}
            title={`Out of Stock: ${stockHealth.outOfStock}`}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div>
            <div className="flex items-center justify-center gap-1.5 text-[12px] text-[#6E746F]">
              <span className="w-2 h-2 rounded-full bg-[#4F8065]" />
              <span>In Stock</span>
            </div>
            <p className="text-[16px] font-bold text-[#252825] tabular-nums mt-1">
              {stockHealth.inStock}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 text-[12px] text-[#6E746F]">
              <span className="w-2 h-2 rounded-full bg-[#F5B853]" />
              <span>Low Stock</span>
            </div>
            <p className="text-[16px] font-bold text-[#252825] tabular-nums mt-1">
              {stockHealth.lowStock}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 text-[12px] text-[#6E746F]">
              <span className="w-2 h-2 rounded-full bg-[#F06560]" />
              <span>Out of Stock</span>
            </div>
            <p className="text-[16px] font-bold text-[#252825] tabular-nums mt-1">
              {stockHealth.outOfStock}
            </p>
          </div>
        </div>
      </section>
      </motion.div>
    </motion.div>
  );
};
