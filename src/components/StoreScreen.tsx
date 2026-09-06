import React from 'react';
import { Product, SaleTransaction } from '../types';
import { InventoryScreen } from './InventoryScreen';

interface StoreScreenProps {
  products: Product[];
  sales?: SaleTransaction[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onCompleteSale?: (transaction: SaleTransaction, updatedProducts: Product[]) => void;
  initialSubTab?: 'inventory' | 'sales';
  initialAddModalOpen?: boolean;
  initialSku?: string;
  isStartingSaleImmediately?: boolean;
}

export const StoreScreen: React.FC<StoreScreenProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  initialAddModalOpen = false,
  initialSku,
}) => {
  return (
    <div id="store-screen-container" className="w-full flex flex-col">
      <InventoryScreen
        products={products}
        onAddProduct={onAddProduct}
        onUpdateProduct={onUpdateProduct}
        onDeleteProduct={onDeleteProduct}
        initialAddModalOpen={initialAddModalOpen}
        initialSku={initialSku}
      />
    </div>
  );
};
