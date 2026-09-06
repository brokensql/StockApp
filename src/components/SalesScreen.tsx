import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus, Receipt, ChevronRight, ArrowLeft, Search, X } from 'lucide-react';
import { Product, SaleTransaction } from '../types';
import { ActiveSaleScreen } from './ActiveSaleScreen';
import { TransactionDetailModal } from './TransactionDetailModal';
import {
  calculatePHTSalesGrowth,
  formatPHTTimestamp,
  getTransactionTimestamp,
} from '../utils/philippineDate';

interface SalesScreenProps {
  products: Product[];
  sales: SaleTransaction[];
  onCompleteSale: (transaction: SaleTransaction, updatedProducts: Product[]) => void;
  onBack?: () => void;
  onStartNewSale?: () => void;
  isStartingSaleImmediately?: boolean;
}

export const SalesScreen: React.FC<SalesScreenProps> = ({
  products,
  sales,
  onCompleteSale,
  onBack,
  onStartNewSale,
  isStartingSaleImmediately = false,
}) => {
  const [isActiveSaleOpen, setIsActiveSaleOpen] = useState(isStartingSaleImmediately);
  const [selectedTransaction, setSelectedTransaction] = useState<SaleTransaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'gcash' | 'card'>('all');

  useEffect(() => {
    if (isStartingSaleImmediately) {
      setIsActiveSaleOpen(true);
    }
  }, [isStartingSaleImmediately]);

  // Compute today's sales summary strictly in Philippine Time (Asia/Manila, UTC+8)
  const growthMetrics = calculatePHTSalesGrowth(sales);
  const todaySalesTotal = growthMetrics.todayTotal;
  const todaySalesCount = growthMetrics.todayCount;

  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleSaleCompleted = (transaction: SaleTransaction, updatedProducts: Product[]) => {
    onCompleteSale(transaction, updatedProducts);
  };

  const handleStartSale = () => {
    if (onStartNewSale) {
      onStartNewSale();
    } else {
      setIsActiveSaleOpen(true);
    }
  };

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Payment method filter
      if (filterMethod !== 'all' && sale.paymentMethod !== filterMethod) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesTx = sale.transactionNumber.toLowerCase().includes(q);
        const matchesPrimary = sale.primaryItemName.toLowerCase().includes(q);
        const matchesItems = sale.items.some((it) => it.name.toLowerCase().includes(q));
        if (!matchesTx && !matchesPrimary && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [sales, searchQuery, filterMethod]);

  if (isActiveSaleOpen) {
    return (
      <ActiveSaleScreen
        products={products}
        onCompleteSale={handleSaleCompleted}
        onCancelSale={() => setIsActiveSaleOpen(false)}
      />
    );
  }

  return (
    <motion.div
      id="sales-overview-screen-view"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-full max-w-[430px] mx-auto px-5 pt-6 pb-28 sm:pb-32"
    >
      {/* Header with Back, Title, and New Sale CTA */}
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-white border border-[#DEE3DE] flex items-center justify-center text-[#252825] hover:bg-[#FAF9F6] active:scale-95 transition-all cursor-pointer shadow-xs"
              aria-label="Back to home"
            >
              <ArrowLeft size={18} strokeWidth={2.2} />
            </button>
          )}
          <div>
            <h1
              id="sales-title"
              className="text-[26px] sm:text-[28px] font-bold text-[#252825] tracking-[-0.02em] leading-tight"
            >
              Sales
            </h1>
            <p
              id="sales-subtitle"
              className="text-[13px] font-normal text-[#6E746F] mt-0.5 tabular-nums"
            >
              {sales.length} {sales.length === 1 ? 'sale' : 'sales'} recorded
            </p>
          </div>
        </div>

        <button
          id="btn-new-sale-header"
          type="button"
          onClick={handleStartSale}
          className="h-10 px-3.5 bg-[#4F8065] hover:bg-[#3D684F] active:bg-[#3D684F] text-white text-[13.5px] font-medium rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          aria-label="Start new sale"
        >
          <Plus size={17} strokeWidth={2.2} />
          <span>New sale</span>
        </button>
      </header>

      {/* Today's Sales Card */}
      <section aria-label="Today's sales summary" className="mb-5">
        <div
          id="today-sales-card"
          className="bg-white border border-[#DEE3DE] rounded-2xl p-4.5 shadow-[0_2px_8px_rgba(37,40,37,0.02)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#6E746F]">
              Today's sales
            </span>
            <span className="text-[11.5px] font-medium px-2.5 py-0.5 rounded-full bg-[#f7f9fb] border border-[#DEE3DE] text-[#6E746F] tabular-nums">
              {todaySalesCount} {todaySalesCount === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>

          <p
            id="today-sales-amount"
            className="text-[26px] font-semibold text-[#252825] mt-1 tabular-nums"
          >
            {formatCurrency(todaySalesTotal)}
          </p>
        </div>
      </section>

      {/* Search and Filters */}
      {sales.length > 0 && (
        <section aria-label="Search and filter sales" className="mb-4 space-y-2.5">
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9690] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product or transaction..."
              className="w-full h-10 pl-9.5 pr-8 bg-white border border-[#DEE3DE] rounded-xl text-[13.5px] text-[#252825] placeholder:text-[#8F9690] focus:outline-none focus:border-[#4F8065] focus:ring-1 focus:ring-[#4F8065] transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#DEE3DE]/60 flex items-center justify-center text-[#6E746F] hover:text-[#252825] cursor-pointer"
                aria-label="Clear search"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'cash', label: 'Cash' },
              { id: 'gcash', label: 'GCash' },
              { id: 'card', label: 'Card' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterMethod(f.id as any)}
                className={`px-3 py-1 text-[12px] font-medium rounded-lg transition-all cursor-pointer ${
                  filterMethod === f.id
                    ? 'bg-[#252825] text-white shadow-xs'
                    : 'bg-white border border-[#DEE3DE] text-[#6E746F] hover:text-[#252825]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Sales List */}
      <section aria-label="Sales transactions list">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <h2
            id="recent-sales-heading"
            className="text-[17px] font-bold text-[#252825]"
          >
            All sales
          </h2>
          <span className="text-[12.5px] text-[#6E746F] tabular-nums">
            {filteredSales.length} of {sales.length}
          </span>
        </div>

        {sales.length === 0 ? (
          /* Empty Sales State */
          <div
            id="empty-sales-state"
            className="py-10 sm:py-12 text-center my-2"
          >
            <h3 className="text-[14px] font-semibold text-[#252825] mb-1.5">
              No sales yet
            </h3>
            <p className="text-[14px] leading-relaxed text-[#6E746F] mb-5 max-w-[260px] mx-auto">
              Completed transactions will appear here. Click any sold item to view its receipt.
            </p>
            <button
              type="button"
              onClick={handleStartSale}
              className="h-11 px-5 bg-[#4F8065] hover:bg-[#3D684F] active:bg-[#3D684F] text-white text-[14px] font-medium rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Plus size={17} strokeWidth={2.2} />
              <span>Record first sale</span>
            </button>
          </div>
        ) : filteredSales.length === 0 ? (
          /* Filter No Match */
          <div className="py-10 sm:py-12 text-center my-2">
            <p className="text-[14px] font-semibold text-[#252825] mb-1.5">
              No matching sales found
            </p>
            <p className="text-[14px] text-[#6E746F] mb-4">
              Try adjusting your search or payment filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterMethod('all');
              }}
              className="h-10 px-4 bg-white border border-[#DEE3DE] text-[#252825] text-[14px] font-medium rounded-xl inline-flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <span>Reset filters</span>
            </button>
          </div>
        ) : (
          /* Sales Rows */
          <div
            id="recent-sales-list-card"
            className="bg-white border border-[#DEE3DE] rounded-2xl divide-y divide-[#DEE3DE] overflow-hidden shadow-[0_2px_8px_rgba(37,40,37,0.02)]"
          >
            {filteredSales.map((sale) => (
              <div
                key={sale.id}
                id={`sale-row-${sale.id}`}
                onClick={() => setSelectedTransaction(sale)}
                className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-[#FAF9F6] active:bg-gray-100 transition-colors group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedTransaction(sale);
                  }
                }}
                aria-label={`View receipt for transaction ${sale.transactionNumber}`}
              >
                {/* Left: Product/Transaction description */}
                <div className="min-w-0 pr-3 flex-1">
                  <p className="text-[14.5px] font-semibold text-[#252825] truncate group-hover:text-[#4F8065] transition-colors">
                    {sale.primaryItemName}
                    {sale.items.length > 1 && (
                      <span className="text-[12.5px] font-normal text-[#6E746F] ml-1">
                        +{sale.items.length - 1} more
                      </span>
                    )}
                  </p>
                  <p className="text-[12.5px] text-[#6E746F] mt-0.5 tabular-nums">
                    {formatPHTTimestamp(getTransactionTimestamp(sale))} · {sale.itemCount} {sale.itemCount === 1 ? 'unit' : 'units'}
                  </p>
                </div>

                {/* Right: Amount and subtle chevron */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-[15px] font-semibold text-[#252825] tabular-nums">
                      {formatCurrency(sale.total)}
                    </p>
                    <span className="inline-block text-[11px] font-medium uppercase px-1.5 py-0.2 rounded text-[#6E746F] bg-[#f7f9fb] border border-[#DEE3DE]">
                      {sale.paymentMethod}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-[#8F9690] group-hover:text-[#4F8065] transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Transaction Detail Receipt Modal */}
      <TransactionDetailModal
        isOpen={Boolean(selectedTransaction)}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </motion.div>
  );
};

