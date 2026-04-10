export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Customer {
  name: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: Customer;
  items: SaleItem[];
  subtotal: number;
  totalQuantity: number;
  discount: number;
  shippingFee: number;
  total: number;
  pendingAmount: number;
  advancePayment: number;
  date: string;
  user_id?: string;
}