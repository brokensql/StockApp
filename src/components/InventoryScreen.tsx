import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Search, Plus, X, AlertCircle } from 'lucide-react';
import { Product, InventoryFilter } from '../types';
import { ProductDetailModal } from './ProductDetailModal';

interface InventoryScreenProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  initialAddModalOpen?: boolean;
  initialSku?: string;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  initialAddModalOpen = false,
  initialSku,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<InventoryFilter>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(initialAddModalOpen);

  useEffect(() => {
    if (initialAddModalOpen) {
      setSelectedProduct(null);
      setIsModalOpen(true);
    }
  }, [initialAddModalOpen]);

  // Compute counts for tabs
  const filterCounts = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => p.stock > p.lowStockThreshold).length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;
    return { all: total, in_stock: inStock, low_stock: lowStock, out_of_stock: outOfStock };
  }, [products]);

  // Filter and search logic
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search match
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query === '' ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        (product.sku && product.sku.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Filter match
      if (activeFilter === 'in_stock') {
        return product.stock > product.lowStockThreshold;
      }
      if (activeFilter === 'low_stock') {
        return product.stock > 0 && product.stock <= product.lowStockThreshold;
      }
      if (activeFilter === 'out_of_stock') {
        return product.stock === 0;
      }
      return true;
    });
  }, [products, searchQuery, activeFilter]);

  const handleOpenAddModal = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleSaveProduct = (product: Product) => {
    if (selectedProduct) {
      onUpdateProduct(product);
    } else {
      onAddProduct(product);
    }
  };

  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const filters: { id: InventoryFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: filterCounts.all },
    { id: 'in_stock', label: 'In stock', count: filterCounts.in_stock },
    { id: 'low_stock', label: 'Low stock', count: filterCounts.low_stock },
    { id: 'out_of_stock', label: 'Out of stock', count: filterCounts.out_of_stock },
  ];

  return (
    <motion.div
      id="inventory-screen-view"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-full max-w-[430px] mx-auto px-5 pt-6 pb-32 sm:pb-36"
    >
      {/* Search Input */}
      <div className="relative mb-3.5 pt-1">
        <div className="absolute inset-y-0 left-0 pl-3.5 pt-1 flex items-center pointer-events-none text-[#6E746F]">
          <Search size={18} strokeWidth={2} />
        </div>
        <input
          id="inventory-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full h-12 pl-10 pr-10 bg-white border border-[#DEE3DE] rounded-2xl text-[15px] text-[#252825] placeholder:text-[#6E746F]/60 focus:outline-none focus:border-[#4F8065] focus:ring-1 focus:ring-[#4F8065] shadow-[0_2px_6px_rgba(37,40,37,0.02)] transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 pt-1 flex items-center text-[#6E746F] hover:text-[#252825] cursor-pointer"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <nav
        aria-label="Stock status filters"
        className="flex items-center gap-2 overflow-x-auto pb-1 mb-5 no-scrollbar -mx-1 px-1"
      >
        {filters.map((filter) => {
          const isSelected = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              id={`filter-${filter.id}`}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`h-9 px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
                isSelected
                  ? 'bg-[#4F8065] text-white shadow-xs'
                  : 'bg-white border border-[#DEE3DE] text-[#6E746F] hover:text-[#252825]'
              }`}
            >
              <span>{filter.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium tabular-nums ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-white border border-[#DEE3DE] text-[#6E746F]'
                }`}
              >
                {filter.count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Products Content List */}
      <section aria-label="Product list">
        {products.length === 0 ? (
          /* Global Empty State */
          <div
            id="empty-inventory-state"
            className="py-10 sm:py-12 text-center my-2"
          >
            <h2 className="text-[14px] font-semibold text-[#252825] mb-1.5">
              No products yet
            </h2>
            <p className="text-[14px] leading-relaxed text-[#6E746F] max-w-[260px] mx-auto">
              Add your first product to start managing your inventory.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Search / Filter Empty State */
          <div
            id="empty-search-state"
            className="py-10 sm:py-12 text-center my-2"
          >
            <h2 className="text-[14px] font-semibold text-[#252825] mb-1.5">
              No products found
            </h2>
            <p className="text-[14px] text-[#6E746F] mb-5 max-w-[260px] mx-auto">
              {searchQuery
                ? `No products matching "${searchQuery}" in this filter.`
                : 'No products currently match this filter.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="h-10 px-4 bg-white border border-[#DEE3DE] text-[#252825] text-[14px] font-medium rounded-xl inline-flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <span>Reset filters</span>
            </button>
          </div>
        ) : (
          /* Clean Product List Rows */
          <div
            id="products-list-card"
            className="bg-white border border-[#DEE3DE] rounded-2xl divide-y divide-[#DEE3DE] overflow-hidden shadow-[0_2px_8px_rgba(37,40,37,0.02)]"
          >
            {filteredProducts.map((product) => {
              const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
              const isOutOfStock = product.stock === 0;

              return (
                <div
                  key={product.id}
                  id={`product-row-${product.id}`}
                  onClick={() => handleOpenEditModal(product)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleOpenEditModal(product);
                    }
                  }}
                  aria-label={`Edit ${product.name}`}
                >
                  {/* Left: Product Name & Stock Info */}
                  <div className="min-w-0 pr-3 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-medium text-[#252825] truncate">
                        {product.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[13px] text-[#6E746F] tabular-nums">
                        {product.stock} {product.stock === 1 ? 'unit' : 'units'}
                      </span>

                      {/* Stock Status Tag */}
                      {isOutOfStock ? (
                        <>
                          <span className="text-[11px] text-[#6E746F]">·</span>
                          <span className="text-[12px] font-medium text-[#252825] flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#9F3F46]" />
                            Out of stock
                          </span>
                        </>
                      ) : isLowStock ? (
                        <>
                          <span className="text-[11px] text-[#6E746F]">·</span>
                          <span className="text-[12px] font-medium text-[#252825] flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#9F3F46]" />
                            Low stock
                          </span>
                        </>
                      ) : (
                        product.category && (
                          <>
                            <span className="text-[11px] text-[#6E746F]">·</span>
                            <span className="text-[12px] text-[#6E746F]">
                              {product.category}
                            </span>
                          </>
                        )
                      )}
                    </div>
                  </div>

                  {/* Right: Price */}
                  <div className="flex-shrink-0 text-right pl-2">
                    <p className="text-[16px] font-semibold text-[#252825] tabular-nums">
                      {formatCurrency(product.price)}
                    </p>
                    {product.sku && (
                      <p className="text-[11px] text-[#6E746F] font-mono mt-0.5">
                        {product.sku}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating Add Product Action Button (Green container with Plus icon above nav bar) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            id="inventory-fab-portal-container"
            className="fixed bottom-[98px] sm:bottom-[106px] left-0 right-0 z-40 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom,0px)]"
          >
            <div className="w-full max-w-[430px] px-5 flex justify-end pointer-events-auto">
              <motion.button
                id="btn-add-product-fab"
                type="button"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.05 }}
                onClick={handleOpenAddModal}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#4F8065] hover:bg-[#3D684F] active:bg-[#3D684F] text-white flex items-center justify-center shadow-[0_6px_22px_rgba(79,128,101,0.45)] transition-colors cursor-pointer border border-white/20 focus-visible:outline-none focus:ring-2 focus:ring-[#4F8065] focus:ring-offset-2"
                aria-label="Add product"
                title="Add product"
              >
                <Plus size={26} strokeWidth={2.4} />
              </motion.button>
            </div>
          </div>,
          document.body
        )}

      {/* Product Detail / Edit Modal */}
      <ProductDetailModal
        isOpen={isModalOpen}
        product={selectedProduct}
        initialSku={initialSku}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        onDelete={onDeleteProduct}
      />
    </motion.div>
  );
};
