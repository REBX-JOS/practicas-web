export interface CartItem {
  productId: number;
  name: string;
  imageUrl: string;
  category: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Cart {
  id: number;
  totalItems: number;
  total: number;
  items: CartItem[];
}
