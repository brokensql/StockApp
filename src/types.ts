export type NavTab = 'home' | 'store' | 'statistics' | 'profile' | 'inventory' | 'sales';

export interface UserProfile {
  ownerName: string;
  storeName: string;
  email: string;
  phone: string;
  address: string;
  businessType: string;
  currency: string;
}

export type InventoryFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  lowStockThreshold: number;
  sku?: string;
  unit?: string;
}

export interface LowStockItem {
  id: string;
  name: string;
  category: string;
  unitsRemaining: number;
  threshold: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  category?: string;
}

export type PaymentMethod = 'cash' | 'gcash' | 'card';

export interface SaleTransaction {
  id: string;
  transactionNumber: string;
  timestamp: string;
  createdAt?: number;
  items: SaleItem[];
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  itemCount: number;
  primaryItemName: string;
}

export interface RecentSale {
  id: string;
  productName: string;
  itemCount: number;
  time: string;
  amount: number;
}

export interface BusinessOverviewData {
  todaySalesTotal: number;
  todayTransactionsCount: number;
  totalProductsCount: number;
  lowStockCount: number;
  lowStockItems: LowStockItem[];
  recentSales: RecentSale[];
}

