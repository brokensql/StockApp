import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { SaleTransaction } from '../types';
import { ReceiptTicketCard } from './ReceiptTicketCard';

interface TransactionDetailModalProps {
  isOpen: boolean;
  transaction: SaleTransaction | null;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  transaction,
  onClose,
}) => {
  if (!transaction) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="transaction-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#252825]/60 backdrop-blur-xs p-4 overflow-y-auto"
        >
          {/* Backdrop Click Dismiss */}
          <div
            className="fixed inset-0"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            id="transaction-modal-sheet"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[380px] my-auto flex flex-col items-center"
          >
            {/* Top Close Button */}
            <div className="w-full flex items-center justify-between mb-2.5 px-1">
              <span className="text-[13px] font-medium text-white/90 drop-shadow-xs">
                Transaction Receipt
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#252825] flex items-center justify-center transition-all cursor-pointer shadow-md"
                aria-label="Close receipt"
              >
                <X size={17} strokeWidth={2.2} />
              </button>
            </div>

            {/* Authentic Receipt Ticket Card */}
            <div className="w-full shadow-2xl rounded-2xl overflow-hidden">
              <ReceiptTicketCard transaction={transaction} />
            </div>

            {/* Bottom Dismiss */}
            <button
              type="button"
              onClick={onClose}
              className="mt-3.5 w-full h-11 bg-white/90 hover:bg-white text-[#252825] text-[13.5px] font-medium rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm"
            >
              Done
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

