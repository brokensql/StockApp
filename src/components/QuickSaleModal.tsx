import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, AlertCircle, Check } from 'lucide-react';
import { Product } from '../types';

interface QuickSaleModalProps {
  isOpen: boolean;
  product: Product | null;
  scannedBarcode: string;
  onClose: () => void;
  onConfirm: (product: Product, quantity: number) => void;
  onScanAgain: () => void;
  onAddAsNewProduct: (barcode: string) => void;
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({
  isOpen,
  product,
  scannedBarcode,
  onClose,
  onConfirm,
  onScanAgain,
  onAddAsNewProduct,
}) => {
  const [quantity, setQuantity] = useState(1);

  // Reset quantity to 1 when a new product is selected
  useEffect(() => {
    setQuantity(1);
  }, [product]);

  if (!isOpen) return null;

  const isOutOfStock = product ? product.stock <= 0 : false;
  const maxStock = product ? product.stock : 1;
  const totalPrice = product ? product.price * quantity : 0;

  const handleIncrement = () => {
    if (product && quantity < product.stock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleSetExact = (qty: number) => {
    if (product) {
      const clamped = Math.max(1, Math.min(qty, product.stock));
      setQuantity(clamped);
    }
  };

  const handleConfirm = () => {
    if (product && !isOutOfStock && quantity > 0) {
      onConfirm(product, quantity);
    }
  };

  return (
    <AnimatePresence>
      <div
        id="quick-sale-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#161816]/60 backdrop-blur-xs overscroll-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          id="quick-sale-modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-sale-modal-title"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[360px] bg-white rounded-3xl p-6 shadow-[0_20px_60px_rgba(22,24,22,0.25)] border border-[#DEE3DE] relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button - floating cleanly at top right */}
          <button
            id="quick-sale-close-btn"
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full text-[#8F9690] hover:text-[#252825] hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {product ? (
            /* --- MINIMAL PRODUCT SALE VIEW (Zero nested containers) --- */
            <div className="space-y-6">
              {/* Product Header: Pure Typography */}
              <div className="pr-8">
                <span className="text-[12px] font-medium text-[#8F9690] block uppercase tracking-wider">
                  {product.category || 'General'}
                  {product.sku ? ` • ${product.sku}` : ''}
                </span>
                <h2
                  id="quick-sale-modal-title"
                  className="text-[22px] font-bold text-[#252825] tracking-tight leading-snug mt-1 break-words"
                >
                  {product.name}
                </h2>

                <div className="flex items-center gap-3 mt-2 text-[13.5px]">
                  <span className="font-semibold text-[#252825] tabular-nums">
                    ₱{product.price.toFixed(2)}
                  </span>
                  <span className="text-[#DEE3DE]">•</span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[12.5px] tabular-nums font-medium ${
                      isOutOfStock
                        ? 'text-red-600'
                        : product.stock <= product.lowStockThreshold
                        ? 'text-amber-600'
                        : 'text-[#4F8065]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOutOfStock
                          ? 'bg-red-500'
                          : product.stock <= product.lowStockThreshold
                          ? 'bg-amber-500'
                          : 'bg-[#4F8065]'
                      }`}
                    />
                    {isOutOfStock
                      ? 'Out of stock'
                      : `${product.stock} available`}
                  </span>
                </div>
              </div>

              {/* Minimal Divider */}
              <div className="border-b border-[#DEE3DE]/70" />

              {isOutOfStock ? (
                <div className="py-2 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center">
                    <AlertCircle size={20} />
                  </div>
                  <p className="text-[14px] font-semibold text-red-600">Out of Stock</p>
                  <p className="text-[12.5px] text-[#6E746F]">
                    This product has 0 units available in inventory.
                  </p>
                </div>
              ) : (
                /* Stepper & Total: Clean, Minimal, No Nested Boxes */
                <div className="space-y-5">
                  {/* Quantity Stepper */}
                  <div className="text-center">
                    <span className="text-[11px] font-semibold tracking-wider text-[#8F9690] uppercase block mb-3">
                      Quantity
                    </span>

                    <div className="flex items-center justify-center gap-6">
                      <button
                        id="quick-sale-qty-minus"
                        type="button"
                        disabled={quantity <= 1}
                        onClick={handleDecrement}
                        className="w-12 h-12 rounded-full border border-[#DEE3DE] text-[#252825] hover:border-[#4F8065] hover:text-[#4F8065] active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={20} strokeWidth={2.2} />
                      </button>

                      <div className="min-w-[72px] text-center">
                        <input
                          id="quick-sale-qty-input"
                          type="number"
                          min="1"
                          max={maxStock}
                          value={quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) handleSetExact(val);
                          }}
                          className="w-full text-center text-[34px] font-bold text-[#252825] bg-transparent border-none focus:outline-none tabular-nums p-0 leading-none"
                        />
                        <span className="text-[11px] text-[#8F9690] block mt-0.5 font-medium">
                          {product.unit || 'units'}
                        </span>
                      </div>

                      <button
                        id="quick-sale-qty-plus"
                        type="button"
                        disabled={quantity >= maxStock}
                        onClick={handleIncrement}
                        className="w-12 h-12 rounded-full border border-[#DEE3DE] text-[#252825] hover:border-[#4F8065] hover:text-[#4F8065] active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus size={20} strokeWidth={2.2} />
                      </button>
                    </div>

                    {/* Quick quantity shortcuts: Minimal text pills */}
                    {maxStock > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        {[1, 2, 3, 5].map((preset) => {
                          if (preset > maxStock) return null;
                          const isSelected = quantity === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleSetExact(preset)}
                              className={`h-7 px-3 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#252825] text-white'
                                  : 'text-[#6E746F] hover:text-[#252825] hover:bg-gray-100'
                              }`}
                            >
                              {preset}
                            </button>
                          );
                        })}
                        {maxStock > 5 && (
                          <button
                            type="button"
                            onClick={() => handleSetExact(maxStock)}
                            className={`h-7 px-3 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
                              quantity === maxStock
                                ? 'bg-[#252825] text-white'
                                : 'text-[#6E746F] hover:text-[#252825] hover:bg-gray-100'
                            }`}
                          >
                            All ({maxStock})
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Total Line - Clean typography without box */}
                  <div className="flex items-baseline justify-between pt-2 border-t border-[#DEE3DE]/60">
                    <span className="text-[13px] text-[#6E746F] font-medium">
                      Total ({quantity} × ₱{product.price.toFixed(2)})
                    </span>
                    <span
                      id="quick-sale-total-display"
                      className="text-[24px] font-bold text-[#252825] tabular-nums"
                    >
                      ₱{totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  id="btn-quick-sale-confirm"
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleConfirm}
                  className="w-full h-12 bg-[#4F8065] hover:bg-[#3D684F] active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-white text-[15px] font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-[0_2px_10px_rgba(79,128,101,0.25)] transition-all cursor-pointer"
                >
                  <Check size={18} strokeWidth={2.4} />
                  <span>Confirm Sale • ₱{totalPrice.toFixed(2)}</span>
                </button>

                <div className="flex items-center justify-center gap-4 pt-1 text-[13px]">
                  <button
                    type="button"
                    onClick={onScanAgain}
                    className="text-[#4F8065] hover:text-[#3D684F] font-semibold transition-colors cursor-pointer"
                  >
                    Scan Next Item
                  </button>
                  <span className="text-[#DEE3DE]">•</span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-[#8F9690] hover:text-[#252825] font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* --- PRODUCT NOT FOUND VIEW (Minimal, Zero Clutter) --- */
            <div className="space-y-5 pt-2">
              <div>
                <span className="text-[12px] font-semibold uppercase tracking-wider text-amber-600 block">
                  Not Registered
                </span>
                <h2 className="text-[19px] font-bold text-[#252825] tracking-tight leading-snug mt-1">
                  Product Not Found
                </h2>
                <p className="text-[13.5px] text-[#6E746F] mt-2 leading-relaxed">
                  No item in your inventory matches this barcode:
                </p>
                <p className="font-mono text-[14px] font-bold text-[#252825] mt-1 tabular-nums break-all">
                  {scannedBarcode || 'Unknown Barcode'}
                </p>
              </div>

              <div className="border-b border-[#DEE3DE]/70" />

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onAddAsNewProduct(scannedBarcode)}
                  className="w-full h-12 bg-[#4F8065] hover:bg-[#3D684F] text-white text-[14px] font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus size={16} strokeWidth={2.4} />
                  <span>Add to Inventory</span>
                </button>

                <div className="flex items-center justify-center gap-4 pt-1 text-[13px]">
                  <button
                    type="button"
                    onClick={onScanAgain}
                    className="text-[#4F8065] hover:text-[#3D684F] font-semibold transition-colors cursor-pointer"
                  >
                    Scan Another Barcode
                  </button>
                  <span className="text-[#DEE3DE]">•</span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-[#8F9690] hover:text-[#252825] font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
