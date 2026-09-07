import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Minus,
  ArrowLeft,
  Check,
  AlertCircle,
  X,
  Camera,
  ShoppingBag,
  RotateCcw,
} from 'lucide-react';
import { Product, SaleItem, SaleTransaction, PaymentMethod } from '../types';
import { formatPHTTimestamp } from '../utils/philippineDate';
import { getNextReceiptId } from '../utils/receiptNumber';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ReceiptTicketCard } from './ReceiptTicketCard';

interface ActiveSaleScreenProps {
  products: Product[];
  onCompleteSale: (transaction: SaleTransaction, updatedProducts: Product[]) => void;
  onCancelSale: () => void;
  initialItems?: SaleItem[];
  initialUnrecognizedBarcode?: string | null;
  onAddNewProductWithBarcode?: (barcode: string) => void;
  existingSales?: SaleTransaction[];
}

export const ActiveSaleScreen: React.FC<ActiveSaleScreenProps> = ({
  products,
  onCompleteSale,
  onCancelSale,
  initialItems = [],
  initialUnrecognizedBarcode = null,
  onAddNewProductWithBarcode,
  existingSales = [],
}) => {
  const [cart, setCart] = useState<SaleItem[]>(() => initialItems || []);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [completedTx, setCompletedTx] = useState<SaleTransaction | null>(null);
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [unrecognizedBarcode, setUnrecognizedBarcode] = useState<string | null>(
    initialUnrecognizedBarcode
  );
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  // Sync initialItems when prop changes from parent (e.g. from fresh barcode scan)
  useEffect(() => {
    if (initialItems) {
      setCart(initialItems);
    }
  }, [initialItems]);

  useEffect(() => {
    if (initialUnrecognizedBarcode) {
      setUnrecognizedBarcode(initialUnrecognizedBarcode);
    }
  }, [initialUnrecognizedBarcode]);

  // Quick lookup of available stock considering items currently in cart
  const getProductRemainingStock = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return 0;
    const inCart = cart.find((item) => item.productId === productId)?.quantity || 0;
    return Math.max(0, prod.stock - inCart);
  };

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    const remainingStock = getProductRemainingStock(product.id);
    if (remainingStock <= 0) {
      setStockWarning(`"${product.name}" has reached maximum available stock.`);
      setTimeout(() => setStockWarning(null), 3000);
      return;
    }

    setStockWarning(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: 1,
          category: product.category,
        },
      ];
    });
  };

  // Adjust quantity - if minus is clicked and drops to zero, show confirmation popup
  const handleUpdateQuantity = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    const existing = cart.find((item) => item.productId === productId);
    if (!prod || !existing) return;

    if (delta > 0) {
      if (existing.quantity >= prod.stock) {
        setStockWarning(`Only ${prod.stock} units available for ${prod.name}.`);
        setTimeout(() => setStockWarning(null), 3000);
        return;
      }
      setStockWarning(null);
      setCart((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setStockWarning(null);
      if (existing.quantity <= 1) {
        // Show confirmation popup when drops to zero
        setItemToDelete({ id: productId, name: prod.name || existing.name });
      } else {
        setCart((prev) =>
          prev.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity - 1 }
              : item
          )
        );
      }
    }
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const total = subtotal;

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Cash calculation
  const parsedTendered = parseFloat(cashTendered) || 0;
  const changeAmount = Math.max(0, parsedTendered - total);
  const isShortCash = cashTendered !== '' && parsedTendered < total;

  // Format currency in Philippine Peso
  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Handle finalize sale
  const handleFinalizeSale = () => {
    if (cart.length === 0) return;
    if (cashTendered !== '' && parsedTendered < total) {
      setStockWarning('Cash received is less than total amount due.');
      setTimeout(() => setStockWarning(null), 3000);
      return;
    }

    // Generate transaction in Philippine Time (Asia/Manila, UTC+8)
    const now = new Date();
    const nowEpoch = now.getTime();
    const timeStr = formatPHTTimestamp(now);

    const txNumber = getNextReceiptId(existingSales);

    const newTransaction: SaleTransaction = {
      id: `tx-${nowEpoch}`,
      transactionNumber: txNumber,
      timestamp: timeStr,
      createdAt: nowEpoch,
      items: cart,
      subtotal,
      total,
      paymentMethod: 'cash',
      itemCount: totalItemsCount,
      primaryItemName: cart[0].name,
    };

    // Calculate updated products stock
    const updatedProducts = products.map((prod) => {
      const cartItem = cart.find((item) => item.productId === prod.id);
      if (cartItem) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - cartItem.quantity),
        };
      }
      return prod;
    });

    setCompletedTx(newTransaction);
    onCompleteSale(newTransaction, updatedProducts);
  };

  const handleScanSuccess = (barcode: string) => {
    setIsScannerOpen(false);
    const cleanCode = barcode.trim();
    const matched = products.find(
      (p) =>
        (p.sku && p.sku.trim().toLowerCase() === cleanCode.toLowerCase()) ||
        p.id.toLowerCase() === cleanCode.toLowerCase() ||
        p.name.trim().toLowerCase() === cleanCode.toLowerCase()
    );

    if (matched) {
      handleAddToCart(matched);
      setUnrecognizedBarcode(null);
    } else {
      setUnrecognizedBarcode(cleanCode);
    }
  };

  // Cash quick presets
  const cashPresets = useMemo(() => {
    const base = [50, 100, 200, 500, 1000];
    const roundedTotal = Math.ceil(total);
    const presets = base.filter((b) => b >= roundedTotal);
    return presets.length > 0 ? presets.slice(0, 4) : [roundedTotal];
  }, [total]);

  // FULL PAGE DIGITAL RECEIPT VIEW UPON COMPLETION
  if (completedTx) {
    return (
      <motion.div
        id="sale-success-full-page"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[430px] mx-auto min-h-[100dvh] bg-[#f7f9fb] px-4 py-8 flex flex-col justify-between"
      >
        <div className="w-full">
          <ReceiptTicketCard
            transaction={completedTx}
            cashTendered={cashTendered}
            changeAmount={changeAmount}
          />
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 pb-2 space-y-2.5">
          <button
            id="btn-sale-receipt-new"
            type="button"
            onClick={() => {
              setCompletedTx(null);
              setCart([]);
              setCashTendered('');
              setUnrecognizedBarcode(null);
            }}
            className="w-full h-13 bg-[#252825] active:bg-black text-white text-[15px] font-semibold rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            <RotateCcw size={18} />
            <span>Start Another Sale</span>
          </button>

          <button
            id="btn-sale-receipt-done"
            type="button"
            onClick={onCancelSale}
            className="w-full h-12 bg-white border border-[#D5D9DE] active:bg-gray-100 text-[#252825] text-[14px] font-semibold rounded-2xl flex items-center justify-center cursor-pointer transition-colors"
          >
            Done (Return to Home)
          </button>
        </div>
      </motion.div>
    );
  }

  // 1 WHOLE PAGE SALE CHECKOUT SCREEN
  return (
    <motion.div
      id="active-sale-full-page"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-full max-w-[430px] mx-auto min-h-[100dvh] bg-[#F7F9FB] flex flex-col justify-between"
    >
      <div
        className="px-5 pt-6 pb-28"
        style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }}
      >
        {/* Top Header */}
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="btn-back-to-home"
              type="button"
              onClick={onCancelSale}
              className="w-9 h-9 rounded-full bg-white border border-[#DEE3DE] flex items-center justify-center text-[#252825] hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1
                id="active-sale-page-title"
                className="text-[22px] sm:text-[24px] font-bold text-[#252825] tracking-tight leading-tight"
              >
                Sale Checkout
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Scan More Barcode Shortcut */}
            <button
              id="btn-scan-more-header"
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="h-9 px-3 rounded-full bg-[#4F8065] hover:bg-[#3D684F] text-white text-[12.5px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Scan barcode with camera"
            >
              <Camera size={15} />
              <span>Scan</span>
            </button>
          </div>
        </header>

        {/* Stock Warning Banner */}
        {stockWarning && (
          <div
            id="stock-warning-banner"
            className="mb-3.5 p-3 bg-[#9F3F46]/10 border border-[#9F3F46]/25 rounded-2xl text-[13px] text-[#252825] flex items-center gap-2.5"
          >
            <AlertCircle size={16} className="text-[#9F3F46] flex-shrink-0" />
            <span className="flex-1">{stockWarning}</span>
          </div>
        )}

        {/* Unrecognized Barcode Banner */}
        {unrecognizedBarcode && (
          <div
            id="unrecognized-barcode-card"
            className="mb-4 p-4 bg-amber-50 border border-amber-200/80 rounded-2xl shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2.5 min-w-0 pr-2">
                <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13.5px] font-bold text-amber-900">
                    Barcode not registered
                  </p>
                  <p className="text-[12px] text-amber-800/90 mt-0.5 font-mono">
                    "{unrecognizedBarcode}" is not yet in your inventory catalog.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnrecognizedBarcode(null)}
                className="p-1 text-amber-700 hover:text-amber-900 cursor-pointer"
                aria-label="Dismiss barcode alert"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {onAddNewProductWithBarcode && (
                <button
                  type="button"
                  onClick={() => onAddNewProductWithBarcode(unrecognizedBarcode)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Register as New Product
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-[12px] font-semibold hover:bg-amber-100/50 cursor-pointer transition-colors"
              >
                Scan Again
              </button>
            </div>
          </div>
        )}

        {/* Scanned Items in Current Sale - Clean, unboxed design */}
        <section aria-label="Current sale items" className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[16px] font-bold text-[#252825]">
              Scanned products
            </h2>
          </div>

          {cart.length === 0 ? (
            <div
              id="empty-cart-state"
              className="py-10 text-center"
            >
              <p className="text-[14px] font-semibold text-[#252825]">
                No products in sale yet
              </p>
              <p className="text-[14px] text-[#6E746F] mt-1 max-w-[240px] mx-auto">
                Scan customer items using the camera scanner.
              </p>
            </div>
          ) : (
            <div id="scanned-items-list" className="divide-y divide-[#DEE3DE]/70">
              {cart.map((item) => {
                const prod = products.find((p) => p.id === item.productId);

                return (
                  <div
                    key={item.productId}
                    id={`cart-item-${item.productId}`}
                    className="py-3.5 space-y-2 select-none rounded-xl px-2 -mx-2 transition-all hover:bg-gray-50/50"
                  >
                    {/* Top Row: Product Name & Line Total */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] font-bold text-[#252825] truncate">
                          {item.name}
                        </p>
                      </div>
                      <span className="text-[15px] font-bold text-[#252825] tabular-nums flex-shrink-0">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                    </div>

                    {/* Bottom Row: Unit Price & Stepper Controls */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12.5px] text-[#6E746F] tabular-nums">
                        {formatCurrency(item.unitPrice)} each
                      </span>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.productId, -1)}
                          className="w-7 h-7 rounded-full bg-white border border-[#DEE3DE] flex items-center justify-center text-[#252825] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>

                        <span className="w-7 text-center text-[14px] font-bold text-[#252825] tabular-nums">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.productId, 1)}
                          disabled={prod && item.quantity >= prod.stock}
                          className="w-7 h-7 rounded-full bg-white border border-[#DEE3DE] flex items-center justify-center text-[#252825] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Subtotal, Total Due, Cash Received & Final CTA */}
        {cart.length > 0 && (
          <div className="pt-5 border-t border-[#DEE3DE] space-y-5 mb-6">
            {/* Subtotal & Total Due Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[13.5px]">
                <span className="text-[#6E746F]">Subtotal</span>
                <span className="text-[#252825] font-semibold tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-[#DEE3DE]">
                <span className="text-[15px] font-bold text-[#252825]">
                  Total Due
                </span>
                <span className="text-[26px] font-black text-[#252825] tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* Cash Received Stacked Section */}
            <div className="pt-2 space-y-2">
              <label
                htmlFor="cash-tendered-input"
                className="block text-[13px] font-bold text-[#252825]"
              >
                Cash received
              </label>
              <div className="flex items-center gap-1.5 pb-2 border-b border-[#DEE3DE] focus-within:border-[#252825] transition-colors">
                <span className="text-[15px] font-bold text-[#252825]">₱</span>
                <input
                  id="cash-tendered-input"
                  type="number"
                  min="0"
                  step="any"
                  placeholder={total.toFixed(2)}
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="w-full text-[15px] font-bold bg-transparent focus:outline-none text-[#252825] placeholder:text-[#6E746F]/40"
                />
              </div>

              {/* Real-time Change Due / Short Info - text color is black, no green shades */}
              {parsedTendered > 0 && (
                <div className="pt-1.5 flex items-center justify-between text-[13.5px]">
                  <span
                    className={
                      isShortCash
                        ? 'text-[#9F3F46] font-medium'
                        : 'text-[#252825] font-semibold'
                    }
                  >
                    {isShortCash ? 'Short by:' : 'Change due:'}
                  </span>
                  <span
                    className={`tabular-nums font-bold text-[15px] ${
                      isShortCash ? 'text-[#9F3F46]' : 'text-[#252825]'
                    }`}
                  >
                    {isShortCash
                      ? formatCurrency(total - parsedTendered)
                      : formatCurrency(changeAmount)}
                  </span>
                </div>
              )}
            </div>

            {/* Complete Sale CTA */}
            <div className="pt-2">
              <button
                id="btn-complete-sale"
                type="button"
                onClick={handleFinalizeSale}
                disabled={isShortCash}
                className="w-full h-12 bg-[#4F8065] active:bg-[#3D684F] hover:bg-[#437258] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[15px] font-bold rounded-full flex items-center justify-center cursor-pointer shadow-sm transition-all"
              >
                <span>Complete Sale</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Barcode Scanner Modal for Adding More Items */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        onProceedToActiveSale={(items, unrecognized) => {
          setIsScannerOpen(false);
          if (items && items.length > 0) {
            setCart((prev) => {
              const map = new Map<string, SaleItem>();
              prev.forEach((item) => map.set(item.productId, { ...item }));
              items.forEach((item) => {
                if (map.has(item.productId)) {
                  const existing = map.get(item.productId)!;
                  map.set(item.productId, {
                    ...existing,
                    quantity: existing.quantity + item.quantity,
                  });
                } else {
                  map.set(item.productId, { ...item });
                }
              });
              return Array.from(map.values());
            });
          }
          if (unrecognized) {
            setUnrecognizedBarcode(unrecognized);
          }
        }}
        products={products}
        title="Scan Barcode"
      />

      {/* Minimalist Black and White Confirmation Popup for Item Removal */}
      {itemToDelete && (
        <div
          id="confirm-removal-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setItemToDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6 border border-[#DEE3DE] shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 className="text-[17px] font-bold text-[#252825]">
                Remove item
              </h3>
              <p className="text-[13.5px] text-[#555A55] leading-relaxed">
                Do you want to remove <span className="font-semibold text-[#252825]">{itemToDelete.name}</span> from this sale?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                id="btn-cancel-remove"
                onClick={() => setItemToDelete(null)}
                className="h-10 px-4 rounded-xl border border-[#DEE3DE] text-[13.5px] font-semibold text-[#252825] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-remove"
                onClick={() => {
                  handleRemoveItem(itemToDelete.id);
                  setItemToDelete(null);
                }}
                className="h-10 px-4 rounded-xl bg-[#252825] text-white text-[13.5px] font-semibold hover:bg-black active:scale-95 transition-all cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
