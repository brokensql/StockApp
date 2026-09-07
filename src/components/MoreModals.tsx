import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Download, Info, Settings as SettingsIcon, BarChart3, LayoutGrid, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Product, SaleTransaction } from '../types';
import { checkForAppUpdate } from '../utils/pwaUpdate';

interface MoreModalProps {
  type: 'categories' | 'reports' | 'backup' | 'settings' | 'about' | null;
  onClose: () => void;
  products: Product[];
  sales: SaleTransaction[];
}

export const MoreModals: React.FC<MoreModalProps> = ({
  type,
  onClose,
  products,
  sales,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [defaultThreshold, setDefaultThreshold] = useState('5');
  const [storeName, setStoreName] = useState('My Sari-Sari Store');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Group products by category
  const categoriesMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category || 'General';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [products]);

  // Compute reports summary
  const totalSalesAmount = sales.reduce((acc, s) => acc + s.total, 0);
  const totalItemsSold = sales.reduce((acc, s) => acc + s.itemCount, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.lowStockThreshold).length;

  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleExportData = () => {
    const dataToExport = {
      storeName,
      exportedAt: new Date().toISOString(),
      productsCount: products.length,
      salesCount: sales.length,
      products,
      sales,
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    toast.success('Downloaded');
    setTimeout(() => setDownloadSuccess(false), 3500);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaved(true);
    toast.success('Saved');
    setTimeout(() => {
      setSettingsSaved(false);
      onClose();
    }, 1000);
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const result = await checkForAppUpdate();
      if (result.status === 'updated') {
        toast.success(result.message);
      } else if (result.status === 'offline') {
        toast.error(result.message);
      } else {
        toast.info(result.message);
      }
    } catch {
      toast.info('App is up to date.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  if (!type) return null;

  return (
    <AnimatePresence>
      <div
        id="more-modal-backdrop"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#252825]/40 backdrop-blur-xs p-0 sm:p-4"
      >
        <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

        <motion.div
          id="more-modal-sheet"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-[430px] bg-white rounded-t-[32px] sm:rounded-[28px] border border-[#DEE3DE] shadow-[0_12px_40px_rgba(37,40,37,0.12)] max-h-[88dvh] flex flex-col overflow-hidden"
        >
          {/* Modal Header */}
          <div className="px-6 pt-5 pb-4 border-b border-[#DEE3DE] flex items-center justify-between">
            <div>
              <h2 className="text-[20px] font-bold text-[#252825]">
                {type === 'categories' && 'Categories'}
                {type === 'reports' && 'Reports summary'}
                {type === 'backup' && 'Backup & export'}
                {type === 'settings' && 'Settings'}
                {type === 'about' && 'About'}
              </h2>
              <p className="text-[13px] text-[#6E746F] mt-0.5">
                {type === 'categories' && `${Object.keys(categoriesMap).length} active categories in inventory`}
                {type === 'reports' && 'Daily overview and inventory metrics'}
                {type === 'backup' && 'Export inventory and transactions'}
                {type === 'settings' && 'App preferences and store info'}
                {type === 'about' && 'Application information and version'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white border border-[#DEE3DE] flex items-center justify-center text-[#6E746F] hover:text-[#252825] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Content */}
          <div className="overflow-y-auto px-6 py-5">
            {/* Categories View */}
            {type === 'categories' && (
              <div className="space-y-4">
                <div className="bg-white border border-[#DEE3DE] rounded-2xl divide-y divide-[#DEE3DE] overflow-hidden">
                  {Object.entries(categoriesMap).map(([cat, count]) => (
                    <div key={cat} className="p-3.5 flex items-center justify-between">
                      <span className="text-[15px] font-medium text-[#252825]">{cat}</span>
                      <span className="text-[13px] text-[#6E746F] bg-white border border-[#DEE3DE] px-2.5 py-0.5 rounded-full font-medium tabular-nums">
                        {count} {count === 1 ? 'product' : 'products'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[13px] text-[#6E746F] text-center pt-2">
                  Categories are automatically updated when managing products in Inventory.
                </p>
              </div>
            )}

            {/* Reports View */}
            {type === 'reports' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white border border-[#DEE3DE] rounded-2xl">
                    <span className="text-[12px] font-medium text-[#6E746F] block mb-1">Total revenue</span>
                    <span className="text-[18px] font-semibold text-[#252825] tabular-nums">{formatCurrency(totalSalesAmount)}</span>
                  </div>
                  <div className="p-4 bg-white border border-[#DEE3DE] rounded-2xl">
                    <span className="text-[12px] font-medium text-[#6E746F] block mb-1">Items sold</span>
                    <span className="text-[18px] font-semibold text-[#252825] tabular-nums">{totalItemsSold} units</span>
                  </div>
                </div>

                <div className="p-4 bg-white border border-[#DEE3DE] rounded-2xl space-y-2.5">
                  <span className="text-[13px] font-medium text-[#6E746F] block">Inventory status</span>
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-[#252825]">Total catalog items</span>
                    <span className="font-semibold text-[#252825] tabular-nums">{products.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-[#252825]">Low stock or out of stock</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#252825] tabular-nums">
                      <span className="w-2 h-2 rounded-full bg-[#9F3F46]" />
                      {lowStockCount} items
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Backup & Export View */}
            {type === 'backup' && (
              <div className="space-y-5 text-center">
                <div className="p-5 bg-white border border-[#DEE3DE] rounded-2xl text-left space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#6E746F]">Products data</span>
                    <span className="font-medium text-[#252825] tabular-nums">{products.length} records</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#6E746F]">Sales transactions</span>
                    <span className="font-medium text-[#252825] tabular-nums">{sales.length} records</span>
                  </div>
                </div>

                {downloadSuccess && (
                  <div className="p-3 bg-[#4F8065]/15 border border-[#4F8065]/30 rounded-xl text-[13px] text-[#252825] flex items-center justify-center gap-2">
                    <Check size={16} className="text-[#4F8065]" />
                    <span>Backup file downloaded successfully.</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExportData}
                  className="w-full h-12 bg-[#4F8065] active:bg-[#3D684F] text-white text-[15px] font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  <Download size={18} strokeWidth={2} />
                  <span>Download backup (JSON)</span>
                </button>

                <p className="text-[12px] text-[#6E746F] leading-relaxed">
                  Export includes all inventory catalog entries, prices, and past point-of-sale transactions.
                </p>
              </div>
            )}

            {/* Settings View */}
            {type === 'settings' && (
              <form onSubmit={handleSaveSettings} className="space-y-4">
                {settingsSaved && (
                  <div className="p-3 bg-[#4F8065]/15 border border-[#4F8065]/30 rounded-xl text-[13px] text-[#252825] flex items-center gap-2">
                    <Check size={16} className="text-[#4F8065]" />
                    <span>Settings saved successfully.</span>
                  </div>
                )}

                <div>
                  <label className="block text-[13px] font-medium text-[#252825] mb-1.5">
                    Store name
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full h-12 px-3.5 bg-white border border-[#DEE3DE] rounded-xl text-[15px] text-[#252825] focus:outline-none focus:border-[#4F8065]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#252825] mb-1.5">
                    Currency symbol
                  </label>
                  <input
                    type="text"
                    disabled
                    value="₱ (PHP - Philippine Peso)"
                    className="w-full h-12 px-3.5 bg-gray-50 border border-[#DEE3DE] rounded-xl text-[14px] text-[#6E746F]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#252825] mb-1.5">
                    Default low stock alert threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={defaultThreshold}
                    onChange={(e) => setDefaultThreshold(e.target.value)}
                    className="w-full h-12 px-3.5 bg-white border border-[#DEE3DE] rounded-xl text-[15px] text-[#252825] focus:outline-none focus:border-[#4F8065]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full h-12 bg-[#4F8065] active:bg-[#3D684F] text-white text-[15px] font-semibold rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                  >
                    Save preferences
                  </button>
                </div>
              </form>
            )}

            {/* About View */}
            {type === 'about' && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-2xl border border-[#DEE3DE] bg-white shadow-xs overflow-hidden mx-auto flex items-center justify-center p-1">
                  <img
                    src="/icon_192.png"
                    alt="StockApp Logo"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>

                <div>
                  <h3 className="text-[19px] font-bold text-[#252825]">
                    StockApp
                  </h3>
                  <p className="text-[13px] text-[#4F8065] font-medium mt-1">
                    Progressive Web App (PWA) • Offline Ready
                  </p>
                  <p className="text-[12px] text-[#6E746F] mt-0.5">
                    Version 1.2.0
                  </p>
                </div>

                <p className="text-[14px] text-[#6E746F] leading-relaxed max-w-[290px] mx-auto pt-1">
                  A modern, mobile-native point-of-sale and inventory manager. Fully cached for offline reliability with instant local data persistence.
                </p>

                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleCheckUpdate}
                    disabled={isCheckingUpdate}
                    className="w-full h-11 bg-[#4F8065]/10 border border-[#4F8065]/25 text-[#4F8065] text-[14px] font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-[#4F8065]/15 transition-colors disabled:opacity-60"
                  >
                    <RefreshCw size={15} className={isCheckingUpdate ? 'animate-spin' : ''} />
                    {isCheckingUpdate ? 'Checking for updates...' : 'Check for updates'}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-11 bg-white border border-[#DEE3DE] text-[#252825] text-[14px] font-medium rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
