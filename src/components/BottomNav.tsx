import React, { useState, useCallback } from 'react';
import {
  Home,
  Package,
  BarChart2,
  User,
  ScanLine,
} from 'lucide-react';
import { NavTab, Product, SaleItem, SaleTransaction } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  products?: Product[];
  sales?: SaleTransaction[];
  onAddProduct?: (product: Product) => void;
  onCompleteSale?: (newTransaction: SaleTransaction, updatedProducts: Product[]) => void;
  onQuickNewSale?: () => void;
  onQuickAddProduct?: () => void;
  onOpenActiveSale?: (params: { items?: SaleItem[]; unrecognizedBarcode?: string | null }) => void;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  icon: React.ElementType;
}

const LEFT_NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'store', label: 'Inventory', icon: Package },
];

const RIGHT_NAV_ITEMS: NavItemConfig[] = [
  { id: 'statistics', label: 'Stats', icon: BarChart2 },
  { id: 'profile', label: 'Profile', icon: User },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  products = [],
  onOpenActiveSale,
}) => {
  // Barcode Scanner states
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Directly open camera scanner on center button click
  const handleCenterButtonClick = useCallback(() => {
    setIsScannerOpen(true);
  }, []);

  const handleCloseScanner = useCallback(() => {
    setIsScannerOpen(false);
  }, []);

  const handleScanSuccess = useCallback(
    (barcode: string) => {
      setIsScannerOpen(false);
      const cleanCode = barcode.trim();

      // Find product matching barcode by SKU, ID, or Name
      const matched = products.find(
        (p) =>
          (p.sku && p.sku.trim().toLowerCase() === cleanCode.toLowerCase()) ||
          p.id.toLowerCase() === cleanCode.toLowerCase() ||
          p.name.trim().toLowerCase() === cleanCode.toLowerCase()
      );

      if (onOpenActiveSale) {
        if (matched) {
          onOpenActiveSale({
            items: [
              {
                productId: matched.id,
                name: matched.name,
                unitPrice: matched.price,
                quantity: 1,
                category: matched.category,
              },
            ],
            unrecognizedBarcode: null,
          });
        } else {
          onOpenActiveSale({
            items: [],
            unrecognizedBarcode: cleanCode,
          });
        }
      }
    },
    [products, onOpenActiveSale]
  );

  const handleProceedToSale = useCallback(
    (items: SaleItem[], unrecognizedBarcode?: string | null) => {
      setIsScannerOpen(false);
      if (onOpenActiveSale) {
        onOpenActiveSale({ items, unrecognizedBarcode });
      }
    },
    [onOpenActiveSale]
  );

  return (
    <>
      {/* Direct Camera Barcode Scanner - transitions into 1 Whole Page ActiveSaleScreen on scan/checkout */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={handleCloseScanner}
        onScanSuccess={handleScanSuccess}
        onProceedToActiveSale={handleProceedToSale}
        products={products}
        title="Scan Barcode"
      />

      {/* Persistent Bottom Navigation Bar */}
      <nav
        id="bottom-nav-container"
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
      >
        <div className="w-full max-w-[430px] relative pointer-events-auto">
          <div
            id="bottom-nav-bar"
            className="bg-white border-x border-t border-[#DEE3DE] rounded-t-[24px] sm:rounded-t-[28px] shadow-[0_-4px_24px_rgba(37,40,37,0.06)] px-2 pt-1.5 pb-2.5 sm:pb-3 flex items-center justify-between relative z-40"
            style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Left Navigation Items */}
            <div className="flex-1 flex items-center justify-around">
              {LEFT_NAV_ITEMS.map((item) => {
                const isActive =
                  item.id === 'store'
                    ? activeTab === 'store' || activeTab === 'inventory'
                    : activeTab === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer select-none focus-visible:outline-none active:scale-95 transition-transform duration-100 bg-transparent"
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.3 : 1.8}
                      className={`transition-colors duration-150 ${
                        isActive
                          ? 'text-[#4F8065]'
                          : 'text-[#8F9690] hover:text-[#252825]'
                      }`}
                    />
                    <span
                      className={`text-[11px] mt-1 leading-none tracking-tight transition-colors duration-150 ${
                        isActive
                          ? 'text-[#4F8065] font-semibold'
                          : 'text-[#8F9690] font-medium'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Center Quick Scan Shortcut Button */}
            <div className="flex-shrink-0 flex items-center justify-center px-1.5 sm:px-2 relative">
              <div className="relative -top-6 flex items-center justify-center">
                <div className="p-1.5 rounded-full bg-white shadow-[0_4px_16px_rgba(37,40,37,0.10)] border border-[#DEE3DE]/70">
                  <button
                    id="nav-center-action-btn"
                    type="button"
                    onClick={handleCenterButtonClick}
                    aria-label="Scan Barcode"
                    title="Scan Barcode"
                    className="w-[58px] h-[58px] sm:w-[62px] sm:h-[62px] rounded-full bg-[#4F8065] text-white flex items-center justify-center shadow-[0_5px_16px_rgba(79,128,101,0.38)] hover:bg-[#3D684F] hover:shadow-[0_6px_20px_rgba(79,128,101,0.48)] active:scale-95 transition-all duration-150 cursor-pointer focus-visible:outline-none"
                  >
                    <ScanLine size={27} strokeWidth={2.3} className="sm:w-7 sm:h-7" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Navigation Items */}
            <div className="flex-1 flex items-center justify-around">
              {RIGHT_NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer select-none focus-visible:outline-none active:scale-95 transition-transform duration-100 bg-transparent"
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.3 : 1.8}
                      className={`transition-colors duration-150 ${
                        isActive
                          ? 'text-[#4F8065]'
                          : 'text-[#8F9690] hover:text-[#252825]'
                      }`}
                    />
                    <span
                      className={`text-[11px] mt-1 leading-none tracking-tight transition-colors duration-150 ${
                        isActive
                          ? 'text-[#4F8065] font-semibold'
                          : 'text-[#8F9690] font-medium'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
