import React from 'react';
import { motion } from 'motion/react';
import { Package, Receipt, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { NavTab } from '../types';

interface PlaceholderScreenProps {
  tab: 'inventory' | 'sales' | 'more';
  onBackToHome: () => void;
}

const TAB_METADATA = {
  inventory: {
    title: 'Inventory',
    description: 'Manage products, track stock counts, and organize categories.',
    icon: Package,
  },
  sales: {
    title: 'Sales',
    description: 'Record point-of-sale transactions, view receipts, and analyze history.',
    icon: Receipt,
  },
  more: {
    title: 'More',
    description: 'Store preferences, export data, and manage application details.',
    icon: MoreHorizontal,
  },
};

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ tab, onBackToHome }) => {
  const meta = TAB_METADATA[tab];
  const Icon = meta.icon;

  return (
    <motion.div
      id={`${tab}-placeholder-view`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-full max-w-[430px] mx-auto px-5 pt-8 pb-28 sm:pb-32 flex flex-col min-h-[70vh]"
    >
      <header className="mb-6 pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-semibold text-[#252825] tracking-[-0.02em]">
            {meta.title}
          </h1>
          <p className="text-[14px] font-normal text-[#6E746F] mt-1">
            Section coming in the next stage
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToHome}
          className="h-10 px-3 rounded-xl bg-white border border-[#DEE3DE] text-[#6E746F] hover:text-[#252825] text-[13px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
          aria-label="Back to Home"
        >
          <ArrowLeft size={16} />
          <span>Home</span>
        </button>
      </header>

      {/* Clean Utility Minimal placeholder box */}
      <div className="flex-1 my-auto flex flex-col items-center justify-center p-8 text-center bg-white border border-[#DEE3DE] rounded-3xl shadow-[0_2px_8px_rgba(37,40,37,0.02)]">
        <div className="w-14 h-14 rounded-2xl bg-white border border-[#DEE3DE] flex items-center justify-center text-[#6E746F] mb-4">
          <Icon size={26} strokeWidth={1.75} />
        </div>
        <h2 className="text-[18px] font-semibold text-[#252825] mb-2">
          {meta.title}
        </h2>
        <p className="text-[14px] leading-relaxed text-[#6E746F] max-w-[260px]">
          {meta.description}
        </p>
      </div>
    </motion.div>
  );
};
